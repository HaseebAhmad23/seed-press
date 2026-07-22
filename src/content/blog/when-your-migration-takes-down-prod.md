---
title: "The Migration That Was 'Just Adding a Column'"
description: "Spoiler: it wasn’t. A Postgres story about locks, bad timing, and the checklist I now run before every DDL change."
pubDate: "2025-11-08T09:42:00.000Z"
tags: ["postgresql", "devops", "backend"]
draft: false
heroImage: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1200&q=80"
---

We needed a nullable `source` column on a table that had grown fat and grumpy over three years. The ticket said "low risk." The deploy window was Friday afternoon. I still don’t know why we picked that slot — collective optimism, probably, and the fact that the team had Friday demos and wanted to ship before them.

The migration was supposed to be instant. It wasn’t. The site partially went down. The post-mortem ran to four pages. And the checklist I now run before every DDL change exists because of this exact afternoon.

This post is what happened, why it happened, and the boring habits I’ve adopted since to make sure it doesn’t happen again.

## What we thought would happen

The migration looked like this:

```sql
ALTER TABLE events ADD COLUMN source VARCHAR(32);
```

In Postgres, adding a nullable column without a default value is supposed to be cheap — the new column gets added to the table’s metadata, but existing rows aren’t rewritten. The operation should take milliseconds, regardless of table size.

The table was big — tens of millions of rows — but adding a nullable column was, in theory, an O(1) operation. Run it, ship it, grab a coffee. That was the plan.

## What actually happened

At 16:58 the migration started. In `psql`, it looked instant. The migration tool reported success.

At 17:02, our application started reporting elevated p95 latency. The connection pool was filling up. Health-check endpoints started timing out.

At 17:08, PagerDuty fired. Someone in chat said "maybe Cloudflare?" (It wasn’t Cloudflare.)

At 17:15, the on-call engineer (me) figured out the migration’s `ALTER TABLE` had taken an `ACCESS EXCLUSIVE` lock, and that lock was queueing behind a long-running analytics query that had been holding a `ROW SHARE` lock on the same table for the past 20 minutes. The migration’s lock request blocked *every other query* that arrived after it, because Postgres queues lock requests in order.

At 17:25, we killed the analytics session. The lock queue drained. Latency returned to normal. The migration completed and the application recovered.

Total partial-outage duration: about 23 minutes. Root cause: not the migration itself, but the *interaction* between the migration and an unrelated long-running query.

## The lock that caused it

The key thing I didn’t fully understand at the time: `ALTER TABLE ... ADD COLUMN`, even for a nullable column with no default, requires an `ACCESS EXCLUSIVE` lock. This is the strongest lock in Postgres — it blocks every other operation on the table, including reads.

That lock acquisition normally takes microseconds. But if any other transaction is currently holding a lock that conflicts (and almost every lock conflicts with `ACCESS EXCLUSIVE`), the migration waits in a queue. *And* any new queries that arrive while the migration is waiting also get queued behind it.

So a long-running analytics query held a weak lock on the table. The migration showed up wanting `ACCESS EXCLUSIVE`, couldn’t get it, and started waiting. Meanwhile, hundreds of application queries arrived per second — all trying to read or write the same table — and each one had to queue behind the waiting migration. The connection pool filled up. Health checks timed out. Users got 500 errors.

The migration didn’t take down the database. The migration *plus* the analytics query *plus* the application’s normal traffic, fighting over one lock queue, took down the database.

## The pre-flight check I now run

Before any DDL change, I run this query to see what’s currently active on the database:

```sql
SELECT
  pid,
  usename,
  application_name,
  state,
  wait_event_type,
  wait_event,
  query_start,
  now() - query_start AS duration,
  query
FROM pg_stat_activity
WHERE datname = current_database()
  AND state != 'idle'
ORDER BY query_start;
```

This shows every active connection, what it’s doing, how long it’s been running, and whether it’s waiting on a lock. If anything in the list has been running for more than a few seconds, I do not run the migration until I understand what it is and whether killing it is safe.

For checking which queries hold locks on a specific table:

```sql
SELECT
  l.relation::regclass AS table,
  l.mode,
  l.granted,
  a.pid,
  a.query
FROM pg_locks l
JOIN pg_stat_activity a ON a.pid = l.pid
WHERE l.relation = 'events'::regclass;
```

(Replace `events` with your table name.) If there are non-granted lock requests, that’s a queue forming. If there are weak locks held by long-running transactions, I either wait or kill them before starting.

## The expand/contract pattern

For schema changes that *do* require rewriting data, the safer pattern is "expand/contract":

1. **Expand:** Add the new schema element in a backwards-compatible way. For example, add a new nullable column.
2. **Backfill:** Migrate data into the new shape in small batches over time. This avoids long-running transactions and lock pressure.
3. **Migrate code:** Update application code to read from the new shape (still falling back to the old shape if needed).
4. **Contract:** Once all code is using the new shape and old data is fully migrated, drop the old shape.

For our case (adding a single nullable column), expand/contract was overkill — the column add itself is meant to be fast. The problem was the lock contention, not the column add. But the same principle applies: small steps, each one safe in isolation, with the ability to pause or roll back at any point.

For a real example: if you needed to add `source VARCHAR(32) NOT NULL DEFAULT 'unknown'` on a huge table, the naive single-statement version would be catastrophic — it would rewrite every row holding `ACCESS EXCLUSIVE` the entire time. The expand/contract version:

1. Add `source VARCHAR(32) NULL` (fast)
2. Application starts writing to it (defaulting to `'unknown'` in code)
3. Backfill `UPDATE events SET source = 'unknown' WHERE source IS NULL` in batches of 10,000 rows with `BEGIN; ...; COMMIT;` between each batch
4. Once all rows have values, `ALTER TABLE events ALTER COLUMN source SET NOT NULL` (still requires `ACCESS EXCLUSIVE`, but is now fast because all rows are valid)
5. Optionally `ALTER TABLE events ALTER COLUMN source SET DEFAULT 'unknown'` for any future inserts

Each step holds the strongest lock briefly. No single statement blocks the table for long.

## The "lock_timeout" safety net

Postgres has a setting that prevents the exact failure mode that hit us:

```sql
SET lock_timeout = '2s';
ALTER TABLE events ADD COLUMN source VARCHAR(32);
```

If the migration can’t acquire its lock within 2 seconds, it fails with an error instead of queueing indefinitely. Failed migrations are easy to retry. Queued migrations that block production are not.

I now set `lock_timeout` in every migration tool, every time. The exact value depends on the situation, but somewhere between 1 second and 30 seconds is usually reasonable. The principle: better to fail fast and retry than to hold up production for an unbounded amount of time.

Many migration frameworks (Django, Rails, Alembic) have settings or hooks for this. Use them.

## The "statement_timeout" companion

While we’re here:

```sql
SET statement_timeout = '5min';
```

This kills any individual SQL statement that runs longer than the timeout. It prevents the "runaway query that locks a table for hours" failure mode.

Both `lock_timeout` and `statement_timeout` should be set as defaults at the role level for any user that runs migrations, with overrides allowed for known-long operations. Once you adopt this, a whole category of "I can’t believe this took down the database" incidents goes away.

## The timing rule I now follow

Migrations don’t run on Fridays. Migrations don’t run before holidays. Migrations don’t run in the last hour of the workday.

Not because the migrations are more likely to fail at those times — but because *recovery* is harder. If something goes wrong on a Tuesday at 10 a.m., I have the whole team, fresh coffee, and the rest of the day to handle it. On a Friday at 4 p.m., I have half a team that’s already mentally checked out and a weekend looming.

If a migration genuinely needs to ship before the weekend, I push for moving the rest of the work earlier, not for cramming the migration into the last possible slot.

## What we told the rest of the company

Short version: "Planned database change hit contention with an unrelated long-running query; we cleared the blocker and the system recovered; no data was lost; total impact was X minutes of elevated error rates."

Long version lived in the post-mortem document, with the relevant `pg_stat_activity` outputs, the timeline reconstructed from logs, the lock chain explained, and the action items (set `lock_timeout`, build a pre-migration checklist, audit long-running analytics queries).

Boring post-mortems age better than dramatic ones. The goal isn’t to tell a war story; it’s to make sure the same incident doesn’t happen twice.

## Lock types worth memorizing (roughly)

You don’t need to recite the manual in standups, but knowing the rough hierarchy of Postgres locks pays off:

- **`ACCESS SHARE`** — what `SELECT` takes. Doesn’t conflict with anything except `ACCESS EXCLUSIVE`.
- **`ROW SHARE`** — what `SELECT ... FOR UPDATE` takes. Doesn’t conflict with most things.
- **`ROW EXCLUSIVE`** — what `INSERT`, `UPDATE`, `DELETE` take. Doesn’t conflict with other DML.
- **`SHARE`, `SHARE ROW EXCLUSIVE`, `EXCLUSIVE`** — taken by some maintenance commands. Conflict with most DML.
- **`ACCESS EXCLUSIVE`** — taken by `ALTER TABLE`, `DROP TABLE`, `TRUNCATE`, etc. Blocks *everything*, including reads.

The pattern: read-mostly operations take weak locks. Schema-changing operations take the strongest lock. The two coexist quietly until a strong-lock operation has to wait, at which point everything piles up behind it.

When in doubt, check the Postgres documentation for your version — the exact behavior of specific commands evolves slightly across releases.

## The pre-migration checklist I now run

Every time, no exceptions:

1. **Check** `pg_stat_activity` **for long-running queries.** Anything running > 10 seconds? Investigate.
2. **Check** `pg_locks` **for any pending lock requests** on the table you’re about to modify.
3. **Set** `lock_timeout` **for the migration.** Default is "no timeout," which is the wrong default for production.
4. **Run a dry-run if possible.** Most migration tools have a "show me the SQL" mode. Read it. Make sure it’s only doing what you expect.
5. **Confirm there’s a rollback plan.** Even if the rollback is "we can recover from this morning’s backup," know it.
6. **Run in a low-traffic window** if the table is busy and the operation might be slow.
7. **Watch the migration in real time.** Don’t run it and walk away. Have `pg_stat_activity` open in another window. If it starts waiting on a lock, you’ll see it immediately.

It takes five extra minutes. It’s prevented at least two more incidents since I started doing it.

## The bigger lesson

The migration that took down production wasn’t the migration. It was the assumption that "low risk in isolation" meant "low risk in context." Schema changes don’t happen in isolation — they happen on top of running production traffic, alongside other queries, with the database’s lock manager mediating all of it.

The boring fix isn’t a clever piece of technology. It’s a process: check before you touch, set timeouts that prevent unbounded waits, expand/contract for any change that rewrites data, and never run anything important when the team can’t respond if it goes sideways.

Now I treat DDL like surgery. Sterile field, checklist, no heroes. The five minutes of pre-flight check has saved many more than five minutes of incident response.

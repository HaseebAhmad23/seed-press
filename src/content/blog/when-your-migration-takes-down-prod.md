---
title: "The Migration That Was 'Just Adding a Column'"
description: "Spoiler: it wasn’t. A Postgres story about locks, bad timing, and the one checklist item I skipped."
pubDate: "2025-11-08T09:42:00.000Z"
tags: ["postgresql", "devops", "backend"]
draft: false
heroImage: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1200&q=80"
---

We needed a nullable `source` column on a table that had grown fat and grumpy over three years. The ticket said “low risk.” The deploy window was Friday 4 p.m. I still don’t know why we picked that slot — collective optimism, probably.

## What we thought would happen

```sql
ALTER TABLE events ADD COLUMN source VARCHAR(32);
```

Run it, ship it, grab a coffee. The table was big (tens of millions of rows) but adding a nullable column *without* a default is supposed to be cheap in Postgres, right?

## What actually happened

The migration **held an AccessExclusiveLock** longer than our connection pool timeout. Reads piled up. The health check endpoint started timing out. PagerDuty did its job and ruined my dinner.

The root cause wasn’t Postgres being evil — it was **everything else** touching that table at the same time: a long-running analytics query, a backfill job someone had left on, and our migration competing for the same lock queue.

## Timeline (approximate, because memory is cruel)

- **16:58** — migration starts, looks “instant” in psql.  
- **17:02** — app pool starts waiting; p95 latency creeps.  
- **17:08** — health checks red; someone says “maybe Cloudflare?” (it wasn’t).  
- **17:25** — we kill the analytics session holding the line; locks drain; sweat cools.  

The column was nullable. The **queue** wasn’t.

## What we told the rest of the company

Short version: “Planned change hit contention; we rolled forward by clearing a blocker job; no data loss.” Long version lived in the incident doc with query IDs and graphs. **Boring postmortems** age better than heroic stories.

## The boring fix that works

1. Run migrations in a window you actually control (not “before the weekend”).  
2. Check `pg_stat_activity` for blockers *before* you `ALTER`.  
3. If the table is hot, use the **expand/contract** pattern: add column nullable → backfill in batches → add constraints later.  

I keep a one-page runbook now. It’s not clever; it’s copy-pasted from scars.

<figure>
  <img src="https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=1200&q=80" alt="Code on a screen in a dark editor" loading="lazy" width="1200" height="675" decoding="async" />
  <figcaption>The calm terminal is a lie; the interesting stuff is always in the lock waits.</figcaption>
</figure>

## Example: the “who is blocking me?” query I run first now

```sql
SELECT pid, wait_event_type, wait_event, query
FROM pg_stat_activity
WHERE datname = current_database()
  AND state != 'idle'
ORDER BY query_start;
```

Not revolutionary. Just **always** run it before touching a table that pays my salary.

## Lock types I wish I’d memorized earlier

You don’t need to quote the manual in standup, but knowing **`ACCESS EXCLUSIVE`** blocks almost everything — including `SELECT` — is the difference between “quick ALTER” and “why is the site down.” When in doubt, check the Postgres docs chart for your version; behavior does evolve slightly across releases.

---

If your migrations are “quick,” good for you. Mine stopped being quick the day a column add became a company-wide incident. Now I treat DDL like surgery: sterile field, checklist, and no heroes.

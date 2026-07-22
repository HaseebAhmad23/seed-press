---
title: "Replacing a Folder of Cron Scripts With n8n: A Practical Walkthrough"
description: "How I migrated a pile of brittle Node and Bash scripts to n8n workflows, what I kept, what I threw away, and the gotchas nobody mentions."
pubDate: "2026-03-25"
tags: ["automation", "n8n", "devops"]
draft: false
heroImage: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80"
---

A few years ago my "automation stack" was a folder of Node and Bash scripts on a small VPS, glued together with `crontab` and prayer. It worked until something broke at midnight, at which point I’d SSH in, tail the logs, and try to remember which script wrote to which log file.

[n8n](https://n8n.io) is the first tool that made me retire most of those scripts without feeling like I’d given up control. It’s open source, you can self-host it, and — most importantly — you can *see* the data flowing through each step instead of sprinkling `console.log` everywhere. This post is how I migrated, what stayed, and the things I had to learn the hard way.

## The setup, in one paragraph

n8n is a workflow engine. You draw a graph: a trigger node (webhook, cron, queue message), some processing nodes (HTTP requests, code, database queries, transformations), and output nodes (Slack, email, database writes). When the trigger fires, each node runs and passes its output to the next. If something fails, you can inspect the exact payload at the failure point. If you’ve used Zapier or Make, the mental model is identical — n8n is the open-source, self-hostable version, which matters when you don’t want a third party seeing your data.

## What I migrated, and what I didn’t

Not every script was a good candidate. Here’s how I sorted them:

**Migrated to n8n:**

- Scheduled API polling (check an external service every 15 minutes, post to Slack on change)
- Webhook-triggered glue (receive a webhook from a third-party, transform, forward to two internal services)
- Weekly digest jobs (aggregate metrics, format an email, send to a mailing list)
- File processing pipelines that touch external APIs at multiple steps

**Kept as plain scripts:**

- Anything performance-critical (parsing GB of logs, sub-100ms latency requirements)
- Long-running batch jobs (data backfills, ETL into a data warehouse)
- Code I wanted to unit test thoroughly with my own test framework
- Anything I’d need to debug offline without n8n running

n8n is excellent glue. It’s not a database, and it’s not where I’d run a 6-hour data pipeline.

## A concrete example: monitoring a third-party API

One of my first migrations: a script that hit a vendor’s status API every 10 minutes, compared the response to the last known state, and posted to Slack if anything changed. Total Node code: about 80 lines, including error handling.

The n8n version is four nodes:

1. **Cron trigger** — every 10 minutes
2. **HTTP Request** — GET the vendor’s `/status` endpoint
3. **IF** — branch on whether `status` changed from the last run (stored in n8n’s static data)
4. **Slack** — post a formatted message on the "yes" branch

What I gained:

- **Visibility.** When something broke, I could open the workflow, see the exact response that confused it, and fix the parsing logic in the UI.
- **Retry semantics for free.** The HTTP node has built-in retry with backoff. Writing the same logic in plain Node took me an hour the first time and was buggy.
- **One less server-side cron file** to forget about.

What I lost:

- **Unit tests.** I had Jest tests for the parsing logic. The n8n version uses inline JS in a Function node; it’s harder to test in isolation. For trivial parsing it doesn’t matter — for anything load-bearing, I keep the logic in a real codebase and call it via HTTP from n8n.

## The mistakes I made early

**1. Putting business logic in Function nodes.**

The Function node lets you write arbitrary JavaScript. It’s tempting to dump 200 lines of transformation logic in there. Don’t. It’s hard to version, hard to test, and impossible to reuse. If your transform is more than ~20 lines, move it to a real service and call it via HTTP from n8n.

**2. Not naming nodes.**

The default node name is the node type (`HTTP Request`, `HTTP Request 1`, `HTTP Request 2`). After a month, looking at a 12-node workflow is a guessing game. Rename every node to what it actually does: `Fetch vendor status`, `Check if changed`, `Notify Slack`. Future you will not regret the keystrokes.

**3. Credentials chaos.**

Early on I created credentials with names like "API key" and "Slack." Six workflows later, I had no idea which credential belonged to which integration, and rotating a key meant clicking through every workflow to check. Now every credential is named after the workflow that uses it: `vendor-status-monitor`, `weekly-digest-smtp`. When something rotates, the blast radius is obvious.

**4. Not setting up alerts on workflow failures.**

n8n logs failures, but it doesn’t shout. For anything important I add an Error Trigger workflow that posts to a dedicated Slack channel when any workflow fails. Otherwise you find out your weekly digest broke when someone asks why they didn’t get one.

## Self-hosting vs. cloud

n8n offers a managed cloud plan. For workflows that touch sensitive data (internal databases, credentials I don’t want a third party to hold), I self-host on a small VPS. The Docker setup is genuinely one command:

```bash
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  -e N8N_HOST=automation.example.com \
  -e WEBHOOK_URL=https://automation.example.com \
  n8nio/n8n
```

Behind a reverse proxy with TLS, this has been stable for me for a long time. Things to remember:

- **Mount the data volume.** All workflows and credentials live in the `~/.n8n` directory. If you don’t mount it, restarting the container wipes everything.
- **Back up the data volume.** The default SQLite database is fine for small setups, but you still need backups. I run a nightly `rsync` to a separate disk.
- **Use Postgres for anything bigger.** SQLite handles small workflow counts fine; once you’re running dozens of workflows or have multiple users, set `DB_TYPE=postgresdb` and point it at a managed Postgres. The migration is one config change plus an export/import.

## Debugging: the most useful pattern

When a workflow misbehaves, the n8n UI lets you click any node in the execution log and see the exact input it received and the output it produced. This sounds obvious until you compare it to debugging the equivalent Bash script, which is "add more `echo`, redeploy, wait for cron, repeat."

The pattern I use:

1. Open the failed execution.
2. Click the node *before* the failure and copy its output JSON.
3. Pin that JSON as a static test input on the failing node.
4. Tweak the logic, hit "execute node," see the result immediately.
5. Once it works, unpin the test data and rerun the whole workflow.

This is the closest thing automation work has to a REPL. Once you internalize the loop, n8n stops feeling like a low-code toy and starts feeling like a productivity multiplier.

## When I wouldn’t reach for n8n

Not every job is a workflow problem. I’d skip n8n for:

- **Pure data transformations** with no external I/O. A 30-line Python script in a normal repo with tests is better.
- **Anything with strict SLAs.** n8n adds a bit of latency per node. For real-time paths, write code.
- **Workflows that need to run for hours.** Long-running executions hold workers and complicate restarts. Use a proper queue and worker setup.

n8n shines in the middle ground: glue between systems, scheduled jobs that need to be visible to non-engineers, and replacing the kind of cron entry that nobody on the team remembers writing.

## What I’d tell my past self

Start by migrating one small, low-stakes workflow. Get familiar with credentials, error handling, and the execution log on something that doesn’t matter. Then migrate the next one. After about five workflows, you’ll have opinions about node naming conventions and folder structure — let those evolve naturally rather than designing them upfront.

The biggest unlock isn’t that n8n is faster to build with than plain code (it usually isn’t). It’s that you can hand a workflow to a colleague who doesn’t write code and say "here’s exactly what this does," and they can follow it. That alone has saved me hours of "what does the Tuesday script actually run?" conversations.

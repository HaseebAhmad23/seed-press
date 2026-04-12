---
title: "I Replaced a Bunch of Cron Scripts with n8n (And Sleep Better)"
description: "n8n looks like a toy until you’re debugging a 2 a.m. webhook. Here’s how I use it for real work — including this blog’s publish pipeline."
pubDate: "2026-03-25"
tags: ["automation", "n8n", "technology"]
draft: false
heroImage: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80"
---

A year ago my “automation stack” was a folder of Node scripts, a forgotten `crontab`, and prayers. Whenever something broke, I’d ssh in, read logs, and swear quietly.

**n8n** is the first tool in a long time that made me retire scripts without feeling like I’d given up control. It’s open source, you can self-host, and — crucially — you can *see* the data at each step instead of sprinkling `console.log` everywhere.

## The one-sentence pitch

Visual pipelines: trigger → do thing → branch if error → Slack me so I don’t find out from a user.

If you’ve used Zapier or Make, the mental model is the same. If you haven’t: imagine Lego, but each brick is “HTTP request” or “Postgres query.”

<figure>
  <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80" alt="Analytics and workflow diagrams on a screen" loading="lazy" width="1200" height="675" />
  <figcaption>I’m not showing my real workflow JSON — trade secrets and embarrassing node names — but this is the vibe.</figcaption>
</figure>

## Concrete example: this blog’s pipeline

Roughly what my publish flow does (yours doesn’t need to match):

| Step | What actually runs |
|------|---------------------|
| 1 | WhatsApp Business webhook receives my message |
| 2 | Code node strips my shorthand (`tags: dev, rust`) into fields |
| 3 | OpenAI node returns Markdown with YAML frontmatter |
| 4 | GitHub creates/commits `src/content/blog/{slug}.md` |
| 5 | WhatsApp replies with “live at …” so I know it worked |

The part that used to hurt in bash? **Step 4** — parsing messy model output, escaping quotes, not committing garbage. In n8n I can pin the failing execution, copy the payload, and fix the prompt without redeploying a server.

## Example: the “parse message” shape

I’m not sharing my full prompt (it changes weekly), but the data object my code node expects looks roughly like this:

```json
{
  "raw": "topic: n8n tips\n tone: casual\n tags: automation, n8n",
  "topic": "n8n tips",
  "tags": ["automation", "n8n"]
}
```

If `topic` is empty, I short-circuit and send myself an angry Telegram message instead of committing nonsense. Learned that the hard way.

## How I debug when step 4 looks “fine”

1. Open the execution, expand **every** node output — not the summary.  
2. Copy JSON into a scratch file and diff against the last good run.  
3. If GitHub returned 422, read the **body** — GitHub’s error messages are annoyingly precise once you scroll past the HTML panic.  

Half my “n8n is broken” moments were **expired credentials** or a branch protection rule I forgot existed.

## Credentials: treat them like milk

Rotate API keys on a calendar reminder. Name them after the workflow (`n8n-blog-publish-prod`) so when you see one in the audit log you know what to revoke. I used to have three keys all labeled “automation” and it was a security *and* sanity problem.

## Why not plain Node?

I *could* ship a single Express app. For a long-running product I might still. But for glue code, n8n wins on:

- **Retries and error branches** without writing the same boilerplate again  
- **Secrets UI** instead of `.env` drift across three machines  
- **Non-engineer readability** when I show someone else what broke  

## Try it in ten minutes

Cloud is fastest if you just want to play:

1. Sign up at [n8n.io](https://n8n.io) — free tier exists  
2. Build “Webhook → Set fields → HTTP Request → Slack”  
3. Break it on purpose and watch the execution log  

Self-hosting one-liner (good for homelab people):

```bash
docker run -it --rm -p 5678:5678 n8nio/n8n
```

Then open `http://localhost:5678` and click around.

## When I wouldn’t use n8n

- **Tight latency** sub-50ms paths where you need compiled code and profiling.  
- **Heavy transformation** that’s really a product (ETL that should live in dbt or a data warehouse).  
- **Secrets you can’t trust a third party with** — self-host fixes part of that; air-gapped doesn’t.  

Use the right hammer. n8n is glue, not a database.

---

Automation pays off in the boring moments: when a pipeline fails *loudly* at step three instead of silently for a week. n8n made those failures visible enough that I actually fix them.

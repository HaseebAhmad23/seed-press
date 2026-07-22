---
title: "Why I Still Route Some Alerts Through Email (Yes, Email)"
description: "Slack is loud. PagerDuty is serious. Email is the boring pipe that quietly outlives every chat app of the year. Here’s when I still reach for it."
pubDate: "2026-03-05T12:09:00.000Z"
tags: ["devops", "automation", "operations"]
draft: false
heroImage: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80"
---

Every team I’ve worked on has a Slack workspace, a webhook for everything, and a dashboard that nobody opens. Most of them also have at least one alert flow that still goes through email — usually because someone tried to "modernize" it and discovered, painfully, that nothing else hit the right audience reliably.

This post is the case for email as part of an alerting toolkit, the specific places I still reach for it, and the mistakes I’ve made building email-based pipelines that I’d rather you skip.

## The argument for email (still)

Email has properties that chat apps don’t:

- **Non-engineers actually check it.** Finance, legal, the operations lead — they live in email. Your Slack post in `#alerts-prod` is invisible to them.
- **It survives notification bankruptcy.** When someone mutes a channel because it’s noisy, your alert is gone. Emails sit in an inbox until they’re read or archived.
- **It threads itself.** Replies attach to the original automatically. You can search a conversation a year later and find context.
- **It crosses company boundaries trivially.** Adding an external auditor to a Slack channel is a process. Adding them to a mailing list is one click.
- **It outlives the tooling.** I’ve worked at three places that switched chat platforms (HipChat → Slack, Slack → Teams, Teams → Slack again). The email lists kept working through every migration.

The point isn’t that email is better than Slack. It’s that they’re different tools, and conflating them leads to the situation where everyone is "alerted" and no one acts.

## When email is the right channel

I reach for email for alerts that match these shapes:

**Weekly digests of slow-moving metrics.** "Failed job count this week was X, down from Y." Nobody needs this on their phone. They need it in their inbox on Monday morning.

**Periodic compliance or audit reports.** Auto-generated summaries that get filed and sometimes read. Slack archives are not where you want these.

**Alerts that need to reach people outside the engineering team.** Anything finance, legal, support, or executive leadership cares about. They’ll see an email; they may never see a Slack ping.

**Long-form alert content.** When the body is more than a sentence — say, a list of failing checks with links to dashboards — email is genuinely a better medium than chat.

**Low-frequency, high-importance alerts.** "Your TLS cert expires in 14 days." You want this in someone’s inbox, with a clear subject line, ideally cc’ing two people in case one is on vacation.

## When email is the wrong channel

Equally important: when I deliberately don’t use it.

**Real-time paging.** If the site is down, email is the worst medium — it’s neither immediate nor acknowledgeable. Use PagerDuty, Opsgenie, or whatever your on-call tool of choice is.

**Anything requiring a button click to acknowledge with legal weight.** Build that in a real system. Email "did you see this" replies don’t hold up.

**High-frequency alerts.** If you send more than a couple per day to the same address, people stop reading. The signal-to-noise problem kills the channel.

**Secrets in the subject line.** Ever. Subjects often end up in unencrypted logs, mobile previews, and backup systems you forgot existed.

## A concrete example: a weekly digest

Here’s a real shape I’ve used (sanitized). The job runs every Monday at 8 a.m. in the company’s primary timezone:

**Workflow:**

1. **Cron trigger** — Monday 08:00 local time
2. **HTTP request** — pull the last 7 days of relevant metrics from an internal API as JSON
3. **Transform** — format into a short HTML summary using a templated string
4. **Send email** — SMTP to the digest mailing list, with both HTML and plain-text bodies

The email itself is intentionally boring:

```html
<h2>Weekly summary — week of Mar 4</h2>
<ul>
  <li>Total orders: 1,243 (+5% vs prior week)</li>
  <li>Failed payment attempts: 47 (-12%)</li>
  <li>Background job failures: 3 (link)</li>
</ul>
<p>Full dashboard: <a href="https://...">click here</a></p>
```

No clever formatting, no embedded images, no JavaScript (most clients strip it). Plain text fallback is a copy of the same content. The whole template is maybe 30 lines.

## Multipart email: the boring detail that matters

If you’re sending HTML, send the plain-text version too. Some email clients (older mobile clients, corporate gateways with aggressive sanitizers, screen readers in specific modes) will render the plain-text part. Many SMTP libraries can build a multipart message in a few lines:

```python
from email.message import EmailMessage

msg = EmailMessage()
msg["Subject"] = "Weekly summary"
msg["From"] = "alerts@example.com"
msg["To"] = "digest@example.com"
msg.set_content("Plain text version of the summary...")
msg.add_alternative("<h2>HTML version</h2>...", subtype="html")
```

The plain-text version doesn’t have to be perfect — it has to be readable. I’ve seen executives forward a digest from their phone, where it rendered as plain text, into a meeting agenda. That detail mattered more than the prettier HTML version that nobody ever saw on a laptop.

## Don’t embed dynamic images

Tracking pixels, on-the-fly chart images, anything that requires an external request to render — these get blocked by corporate mail servers, mobile clients with image-loading off, and privacy-conscious users. If you need to show a chart, link to the dashboard. The link works; the embedded image fails silently.

## Unsubscribe and ownership matter, even internally

Internal digests don’t need CAN-SPAM unsubscribe footers, but they need an owner and a sane list name. A few habits that have saved me:

- **Name the list after its purpose**, not the team that owns it today (`infra-weekly@`, not `bobs-team@`).
- **Document the workflow** that sends it. Even a one-line README in the automation repo: "this workflow sends `infra-weekly@`, contact: [person]."
- **Mark the From address clearly**, e.g. `alerts-noreply@example.com`. Replies should go somewhere a human reads them, or the From should make clear it’s automated.
- **When someone leaves**, audit the list ownership. I’ve seen automated digests email ex-employees for years after they were offboarded because no one knew which workflow generated them.

## SMTP retries and the silent ban

The mistake I’ve made twice: not setting retry/backoff on the send. SMTP providers throttle aggressively. If your workflow sends one email and gets a temporary failure, you want to retry — but with backoff, and with an upper bound. Retrying 50 times in a tight loop is a great way to get your sender key flagged.

What I do now:

- Retry on transient failures (4xx response codes) with exponential backoff
- Don’t retry on permanent failures (5xx with specific codes like "mailbox full")
- Log every failure once, not every retry attempt
- After N retries, send *one* alert to a separate channel (Slack) — not another email

## What goes in the subject line

Subject lines are a UI. Treat them seriously:

- **Lead with the system or category.** `[infra-weekly] Summary for week of Mar 4` is searchable; `Weekly Update` is not.
- **Include enough context to act on without opening.** "Cert for example.com expires in 7 days" lets someone judge urgency from the preview.
- **Don’t put dynamic IDs in subjects of digest emails.** They break threading in most clients. Keep the subject stable across runs.

## Why this still beats some "modern" replacements

A few years ago I tried to migrate a digest from email to a Slack channel + dashboard combination. It looked better. It was easier to update. After two weeks the channel was muted by everyone who needed to read it, and the dashboard had 11 visits — 10 of them mine.

The digest went back to email. Engagement returned. The lesson: the right medium isn’t always the newest one. It’s the one your audience already uses for the thing you’re asking them to do.

## The boring takeaway

Email isn’t exciting. It’s not going on a conference talk slide. But for a specific shape of alert — periodic, multi-audience, longer-form, non-urgent — it’s genuinely the best tool I have. Knowing when to use which channel is more valuable than picking a favorite. The mistake to avoid is treating every alert the same and wondering why nobody acts on any of them.

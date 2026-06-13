---
title: "Structured Logs vs. Print Statements: A Weekend I’ll Never Get Back"
description: "One Saturday outage taught me why JSON logs, request IDs, and consistent field names aren’t resume fluff. The before/after, with examples."
pubDate: "2026-01-09T20:14:00.000Z"
tags: ["observability", "backend", "devops"]
draft: false
heroImage: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80"
---

Saturday, 9 p.m. A user reports "sometimes checkout fails." I open the logs to investigate. What I see is a wall of strings:

```
ERROR payment failed
ERROR payment failed
INFO retry
ERROR payment failed
ERROR payment failed user@example.com
```

Same error message, no context, no way to tell which checkouts these belong to, no link between the "retry" line and the failures around it. The user gives me their email; I `grep` for it and find one of those lines. Now I have a single log entry and zero idea what happened around it.

I spent the next four hours reconstructing what should have taken twenty minutes. On Monday, after coffee, I rewrote the logging.

This post is the before/after of that rewrite, the patterns I’ve carried to every project since, and why "structured logging" is one of the highest-leverage things a backend team can invest in.

## The before

The original logging followed a pattern I’d call "print statements with a log level." Lines looked like:

```python
logger.error("payment failed")
logger.info("retry attempt")
logger.error(f"payment failed {user_email}")
```

Each line is a string. Different developers wrote slightly different versions of the same event. There’s no correlation across services. There’s no way to ask the data structured questions like "how many `card_declined` errors happened in the last hour" without a regex.

The fundamental problem is that strings aren’t data. They’re text that contains data, which means any analysis has to parse them — and the parsing is fragile because the strings are inconsistent.

## The after

We made three changes that, together, transformed how we operated:

**1. JSON-structured logs.** Every log line is a JSON object with consistent fields:

```json
{
  "level": "error",
  "msg": "stripe_charge_failed",
  "request_id": "req_8f2a9b3c",
  "user_id": "usr_991",
  "error_code": "card_declined",
  "amount_cents": 5000,
  "ts": "2026-01-09T20:14:02Z"
}
```

The `msg` field is a stable identifier (snake_case, no punctuation, no dynamic content). The other fields are typed values. This is the format that lets you go from `grep` to `jq` for log analysis — and from `jq` to a real log aggregator like CloudWatch, Datadog, or a self-hosted Loki/Elasticsearch setup.

**2. Request IDs that propagate.** Every incoming HTTP request gets a request ID. If the client sends an `X-Request-ID` header, we use it; if not, we generate one. The ID is attached to every log line emitted while processing that request, including from downstream services we call.

When service B logs an error, the request ID matches the one in service A’s logs. Suddenly you can trace a single user action across the entire stack with one `grep`.

**3. One consistent naming convention.** We picked snake_case for log field names and committed to it across services. This is boring infrastructure work that pays off the first time you try to write a dashboard query and don’t have to remember whether it’s `user_id`, `userID`, or `userId` in service X.

## The code: middleware that adds context

In a Python web app, the middleware looks roughly like this (framework-agnostic version):

```python
import uuid
import contextvars

request_context = contextvars.ContextVar("request_context", default={})

def request_id_middleware(request, get_response):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    user_id = getattr(request.user, "id", None)

    request_context.set({
        "request_id": request_id,
        "user_id": user_id,
        "path": request.path,
        "method": request.method,
    })

    response = get_response(request)
    response.headers["X-Request-ID"] = request_id
    return response
```

The logger then reads from the context variable on every log call and includes those fields automatically. Code in the request handler doesn’t have to remember to add `request_id` to every log line — it’s injected automatically.

For propagation to downstream services, the HTTP client is wrapped to include `X-Request-ID` in outgoing requests:

```python
def call_payment_service(payload):
    ctx = request_context.get()
    headers = {
        "X-Request-ID": ctx.get("request_id"),
        "Content-Type": "application/json",
    }
    return requests.post("https://payments.internal/charge", json=payload, headers=headers)
```

The payment service reads the header and uses the same request ID in its own logs. One ID, two services, full traceability.

## Example log line patterns

A few conventions we’ve adopted that have aged well:

**The `msg` field names an event, not a sentence.**

Good: `"msg": "user_login_succeeded"`
Bad: `"msg": "User has successfully logged in"`

Event names can be aggregated, counted, dashboarded. Sentences can’t.

**Dynamic data goes in separate fields, not in the message.**

Good:
```json
{ "msg": "stripe_charge_failed", "user_id": "usr_991", "error_code": "card_declined" }
```

Bad:
```json
{ "msg": "Stripe charge failed for user usr_991 with code card_declined" }
```

The good version lets you filter by `user_id` or `error_code` in milliseconds. The bad version forces a regex on the message string.

**Errors include enough context to act on.**

```json
{
  "level": "error",
  "msg": "payment_provider_request_failed",
  "request_id": "req_8f2a9b3c",
  "user_id": "usr_991",
  "provider": "stripe",
  "operation": "charge",
  "http_status": 503,
  "retryable": true,
  "duration_ms": 8245
}
```

This single line tells me: a charge request to Stripe failed with 503, it’s probably retryable, it took 8 seconds before failing (so likely a timeout), and I can find the specific user’s checkout flow by request ID. Compare to the original "ERROR payment failed."

## What we deliberately don’t log

This list is at least as important as the previous one:

- **Passwords, tokens, full credit card numbers, secret keys.** Ever. Logs end up in backups, in third-party services, in someone’s screen-share. If you’re not sure whether a field is sensitive, ask security before you add it. Retroactive log scrubbing is not a fun weekend.
- **Entire request and response bodies on high-traffic endpoints.** Sampling exists for a reason. Logging every payload on a high-throughput endpoint fills up your aggregator and your bill.
- **Personal data we can’t justify under our retention policy.** Logs are a data store. The same legal requirements that apply to your database apply to your logs. If you can’t legally keep the data for 90 days, don’t log it for 90 days.

## Useful `jq` patterns when you’re still on `grep`-style logs

Before a proper log aggregator is in place, `jq` does a surprisingly good job on JSON log files. A few one-liners I run:

```bash
# Last 50 error events with their codes
grep '"level":"error"' app.log | tail -50 | jq -c '{msg, request_id, error_code}'

# Count of each error code in the last hour
grep '"level":"error"' app.log | jq -r .error_code | sort | uniq -c | sort -rn

# All log lines for a specific request_id, across services
cat *.log | jq -c 'select(.request_id == "req_8f2a9b3c")'

# Slow requests (over 1s)
cat app.log | jq -c 'select(.duration_ms > 1000) | {msg, request_id, duration_ms}'
```

These aren’t pretty. They are dramatically faster than clicking through dashboards when production is loud and you need an answer in 30 seconds.

## Tracing without full OpenTelemetry

OpenTelemetry is the standard for distributed tracing, and if you’re building a system that warrants it, use it. For smaller setups, propagating a single request ID across services and including it in logs gets you 80% of the value with 5% of the operational complexity.

The trade-off: you don’t get the visual trace timeline that proper tracing gives you, but you can reconstruct most of it with a `jq` query and a sort by timestamp. For a small team starting out, that’s often the right initial choice.

## Log levels: pick something, stop arguing

Teams will spend more time arguing about `info` vs. `warn` than the difference is worth. The boundaries we use:

- **error** — needs human attention, or a user journey is broken
- **warn** — degraded but handled; might become an error if it keeps happening
- **info** — meaningful lifecycle events (request started, job completed) you’ll grep monthly
- **debug** — only enabled in development or for short-lived production investigations

Imperfect taxonomy; the point is that everyone on the team uses the same rules. Inconsistency between developers is worse than any specific choice.

## The habit that stuck

Whenever I add a new error branch in code, I name the event like an analytics event. `oauth_token_expired`, `webhook_signature_invalid`, `database_connection_pool_exhausted`. Not "Error: something went wrong" or `e.message`. The few extra seconds at write-time make the error searchable, aggregatable, and dashboardable for the rest of its life.

Future me, on call at 3 a.m., sends silent thanks.

## The investment is worth it

Migrating to structured logging takes effort. There’s a middleware to write, a logger to configure, a team conversation about field naming conventions, and the slow process of updating existing log calls.

It pays for itself the first time you’re debugging a production issue and you need to answer "what was happening for this specific user, across all our services, in the five minutes before they hit this error." With structured logs, that’s a single query. Without them, it’s an evening of grep gymnastics and educated guessing.

Print debugging is fine in development. In production, structure is how you buy your weekend back.

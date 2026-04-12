---
title: "Structured Logs vs. Print Statements: A Weekend I’ll Never Get Back"
description: "One outage taught me why JSON logs and correlation IDs aren’t resume fluff."
pubDate: "2026-01-09T20:14:00.000Z"
tags: ["observability", "backend", "devops"]
draft: false
heroImage: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80"
---

Saturday, 9 p.m. A user reports “sometimes checkout fails.” Logs are a **wall of strings**:

```
ERROR payment failed
ERROR payment failed
INFO retry
```

Same message, three different code paths. Which one? Good question.

## What we changed Monday (after coffee)

- **Structured JSON** per line: `level`, `msg`, `request_id`, `user_id`, `error_code`.  
- **Middleware** that generates or forwards `X-Request-ID` from the edge.  
- **One** field naming convention across services (we picked snake_case and stopped arguing).

## Example log line (fake data)

```json
{
  "level": "error",
  "msg": "stripe_charge_failed",
  "request_id": "req_8f2a",
  "user_id": "usr_991",
  "error_code": "card_declined",
  "ts": "2026-01-09T20:14:02Z"
}
```

Suddenly grep becomes **jq**, and dashboards become possible without a séance.

## What we deliberately don’t log

- Raw passwords, tokens, full credit card numbers — **ever**.  
- Entire request bodies on high-traffic endpoints — sampling exists for a reason.  
- Personal data we can’t justify under our retention policy — legal beats debugging.  

If you’re not sure, ask security *before* you add the field. Retroactive log scrubbing is not a fun weekend.

## Tracing across two services (minimal version)

Service A generates `request_id` and sends it in a header. Service B copies it into **every** log line for that request. That’s not full OpenTelemetry — it’s **80% of the win** for correlating “frontend said X” with “worker did Y.”

## `jq` one-liners I actually run

```bash
# last 50 errors with request_id
grep '"level":"error"' app.log | tail -50 | jq -c '{msg, request_id, error_code}'

# count by error_code
grep '"level":"error"' app.log | jq -r .error_code | sort | uniq -c | sort -rn
```

Ugly? Sure. Faster than clicking through three dashboards when prod is loud.

<figure>
  <img src="https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1200&q=80" alt="Team reviewing data on laptop" loading="lazy" width="1200" height="675" />
  <figcaption>Good logs are a gift to the person on call — who is often you.</figcaption>
</figure>

## The habit that stuck

When I add a new error branch, I **name the event** like an analytics event: `oauth_token_expired`, not `Error: something went wrong`. Future me sends thanks.

## Log levels I try not to argue about

- **error** — needs human attention or breaks a user journey.  
- **warn** — degraded but handled; might become an error soon.  
- **info** — lifecycle events you’ll grep monthly.  
- **debug** — only in dev or short-lived troubleshooting.  

Teams disagree on the middle two; picking *something* consistent beats perfect taxonomy.

---

Print debugging is fine in development. In production, **structure** is how you buy your weekend back.

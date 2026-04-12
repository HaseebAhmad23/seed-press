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

<figure>
  <img src="https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1200&q=80" alt="Team reviewing data on laptop" loading="lazy" width="1200" height="675" />
  <figcaption>Good logs are a gift to the person on call — who is often you.</figcaption>
</figure>

## The habit that stuck

When I add a new error branch, I **name the event** like an analytics event: `oauth_token_expired`, not `Error: something went wrong`. Future me sends thanks.

---

Print debugging is fine in development. In production, **structure** is how you buy your weekend back.

---
title: "Three API Mistakes I’ve Shipped (So Maybe You Won’t)"
description: "Versioning, pagination, and the boolean that meant three different things."
pubDate: "2026-02-17T10:22:00.000Z"
tags: ["api", "backend", "technology"]
draft: false
heroImage: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=1200&q=80"
---

Public APIs are **promises**. Private APIs are promises to **future you**, who will not remember your Slack explanation from 2024.

## Mistake 1: ‘We’ll version later’

We didn’t. Clients hard-coded URLs. Renaming a field became a **breaking change** with angry emails. Now I default to `/v1/` even when it feels silly. You can deprecate; you can’t un-break someone’s integration.

## Mistake 2: offset pagination forever

`?page=2&limit=50` is easy until the table is huge and indexes fight you. For anything feed-like, I reach for **cursor** pagination (`after=opaque_token`) early. More work upfront, fewer “why is page 400 slow?” tickets.

## Mistake 3: the overloaded `active` flag

`active=true` meant “not deleted” for admins, “subscription paid” for billing, and “visible in UI” for the app. Three teams, **one** JSON key. We split into explicit fields and migrated with a boring spreadsheet.

<figure>
  <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80" alt="People collaborating over laptop" loading="lazy" width="1200" height="675" decoding="async" />
  <figcaption>API design is mostly naming things and not lying with those names.</figcaption>
</figure>

## Example: clearer error shape

Instead of:

```json
{ "error": "Bad Request" }
```

Prefer something **machine-friendly**:

```json
{
  "error": {
    "code": "invalid_email",
    "message": "Email must contain @",
    "field": "email"
  }
}
```

Clients can branch on `code`; humans still read `message`.

## Idempotency keys (the feature I skip at my peril)

POST that charges money or sends email should accept an **Idempotency-Key** header (or equivalent). Retries happen — networks lie. Document which operations are safe to repeat and what the second call returns.

## Rate limits deserve a structured body too

`429` with `Retry-After` is polite. JSON like `{ "retry_after_seconds": 30, "limit": 100, "window": "1m" }` saves integration partners from parsing headers differently across languages.

## Deprecation that people actually see

`Sunset` headers, changelog entries, and **email to integrators** beat a quiet field rename. I’ve been the angry consumer of an API that “versioned” by surprise; I try not to inflict that.

---

Good APIs feel boring. **Exciting** APIs usually mean someone’s guessing.

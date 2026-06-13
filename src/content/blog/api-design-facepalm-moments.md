---
title: "Three API Design Mistakes I’ve Shipped (So You Don’t Have To)"
description: "Versioning, pagination, and the overloaded boolean that meant three different things. Real mistakes, real fixes, and what I’d do differently."
pubDate: "2026-02-17T10:22:00.000Z"
tags: ["api", "backend", "engineering"]
draft: false
heroImage: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=1200&q=80"
---

Public APIs are promises. Private APIs are promises to future you, who will not remember your Slack explanation from two years ago. I have shipped some bad APIs. The good news is that bad APIs teach you the most. This post walks through three specific mistakes I’ve made, what they cost, and the patterns I default to now.

These are the boring, predictable ones — not because they’re the only mistakes worth writing about, but because they show up in almost every API I’ve seen built without enough caution.

## Mistake 1: "We’ll version it later"

The first time I shipped a public-ish API at a startup, I argued against `/v1/` in the URL. The reasoning sounded smart: "We’re moving fast, we can change anything, we’ll add versioning when we need it." Everyone nodded. We didn’t version.

Six months later we needed to rename a field. The polite client team had hardcoded the old name in three places, the less-polite client team had pulled the JSON straight into their database schema, and our public docs page (which we’d sworn we’d update before each release) was 4 versions behind reality.

The "rename" became a six-week migration with a deprecation period, a feature flag in the API, and an apologetic email to every integrator. All to avoid typing `/v1/` in a URL.

**What I do now:**

- Default to `/v1/` from day one, even on internal APIs I think only I will use. You can always deprecate. You can’t un-break someone’s integration.
- Document the versioning policy in the API’s README. Something like: "We commit to supporting v1 for at least 12 months after v2 is released."
- For breaking changes, version up. For additive changes (new optional fields, new endpoints), stay on the current version. This is the standard playbook for a reason.
- For internal-only APIs where versioning truly is overkill, at minimum use a `X-Schema-Version` header so you can detect drift and add proper versioning later without a URL change.

The cost of versioning early is one or two extra characters in every URL. The cost of versioning late is a sprint nobody wanted to do.

## Mistake 2: Offset pagination forever

`?page=2&limit=50` is the most natural API to design and one of the most painful to live with. The pattern is so easy to write that you barely notice you’ve shipped it — until the table backing it grows past a few million rows and someone tries to paginate to page 4,000.

The problem is mostly database-shaped. `OFFSET 200000 LIMIT 50` on a large table forces the database to count past 200,000 rows before returning anything. Even with indexes, that gets slow. Worse, if rows are inserted or deleted between page requests, items can disappear or appear twice — there’s no consistency guarantee across page boundaries.

I’ve shipped offset pagination on a feed endpoint. We got our first "the API is slow" ticket when the feed had grown by an order of magnitude. The fix was migrating to cursor pagination, and the migration was annoying because every client had to update their pagination code.

**What I do now:**

- Default to **cursor pagination** for anything that looks like a feed, list, or scrollable collection. The API returns a cursor (an opaque token, usually base64-encoded) that the client passes back to fetch the next page.
- The cursor encodes "the last item you saw" — usually a sortable key like `(created_at, id)` for stable ordering. The database can use an index to jump directly to "everything after this point" in milliseconds, regardless of how deep the user is in the list.
- Reserve offset pagination for admin tools and back-office UIs where you genuinely need to jump to page 47, and where the underlying table is small enough that performance isn’t a concern.

A minimal cursor-pagination response shape:

```json
{
  "items": [...],
  "next_cursor": "eyJjcmVhdGVkX2F0IjoiMjAyNi0wMy0...",
  "has_more": true
}
```

The cursor is opaque to the client. That’s the point — you can change its internal format later without breaking integrations.

## Mistake 3: The overloaded `active` flag

`active` looked harmless. The user model had `active: boolean`. For the admin team, `active=true` meant "not soft-deleted." For the billing team, it meant "subscription is paid." For the app team, it meant "shown in the UI."

Three teams. One JSON key. Three different definitions of truth.

For a while it worked, because the three meanings happened to overlap most of the time. Then we shipped a feature where you could "freeze" an account — active for billing purposes, hidden from the UI, but not deleted. The `active` flag couldn’t represent this. Adding a fourth meaning to it would have made the next bug inevitable.

We split `active` into three explicit fields:

- `is_deleted: boolean` — for the admin/data-retention story
- `subscription_status: enum` — `active`, `past_due`, `cancelled`, etc.
- `visibility: enum` — `visible`, `frozen`, `hidden`

The migration was tedious because every consumer of the old field had to be updated, but the resulting API is unambiguous. No one asks "active for what?" anymore.

**What I do now:**

- Boolean fields are a smell when they describe state. Booleans are for properties that are genuinely binary forever ("is this a corporate account"). Anything that might grow a third option should be an enum.
- I avoid generic names like `active`, `status`, `enabled`, `valid`. They invite future overloading. Use names that describe *what specifically* is being represented: `subscription_status`, `email_verified`, `account_locked`.
- When a single field is being read by multiple teams who interpret it differently, that’s a design problem, not a documentation problem. Split it.

## The bonus mistake: vague error responses

This one barely makes the list because it’s so common, but it’s worth mentioning. Returning:

```json
{ "error": "Bad Request" }
```

…is essentially useless to a client. They can’t branch on it, they can’t show a sensible message to the user, and they can’t tell which field was wrong.

A machine-friendly shape:

```json
{
  "error": {
    "code": "invalid_email",
    "message": "Email must be a valid format",
    "field": "email"
  }
}
```

Clients can branch on `code`. Humans can read `message`. Frontends can highlight `field`. Three properties; ten times more useful. Make it consistent across every endpoint.

## A pattern I add to every API now: idempotency keys

Any POST that has side-effects — charging a card, sending an email, creating an order — accepts an `Idempotency-Key` header. The server stores the response keyed by that header for some period (24 hours is typical), and returns the cached response on retries.

```http
POST /v1/charges
Idempotency-Key: 5f3a8c7e-2b1d-4e6f-9a0c-7d8b1c3e4f5a
Content-Type: application/json

{ "amount": 1000, "currency": "USD" }
```

Why this matters: networks lie. Mobile clients lose connection mid-request. Background jobs retry. Without idempotency keys, a "successful" retry can charge a customer twice — and you’ll find out from a support ticket, not your logs.

Stripe popularized this pattern for a reason. It’s not optional for any API that costs money or sends messages.

## Rate limits deserve a real response

A `429 Too Many Requests` with a `Retry-After` header is the minimum. Better is a structured JSON body that integrators can parse:

```json
{
  "error": {
    "code": "rate_limited",
    "message": "Too many requests",
    "retry_after_seconds": 30,
    "limit": 100,
    "window": "1m"
  }
}
```

Now your integration partners don’t have to write language-specific code to parse the `Retry-After` header (which has two formats, and yes, both are in the spec). They get one place to look, in JSON, that works the same in every language.

## How I sequence breaking changes now

If I have to deprecate something:

1. **Announce in the changelog and email integrators.** Give a date.
2. **Add a `Sunset` header** to responses from the deprecated endpoint, pointing to the replacement.
3. **Log usage** of the deprecated endpoint so I know who’s still calling it as the date approaches.
4. **Email the top users directly** in the last month if they haven’t migrated.
5. **Remove on the announced date** — not earlier, not silently later.

The worst feeling as an API consumer is finding out a field was renamed because your integration broke in production. The work to avoid that is mostly communication, not engineering.

## The boring takeaway

Good APIs feel boring. You read the docs, the request shape makes sense, the error response tells you exactly what went wrong, and there are no surprises six months later. Exciting APIs usually mean somebody’s guessing.

The mistakes in this post all share a common root: optimizing for "easy to build today" over "easy to live with for years." That tradeoff isn’t always wrong. For an API you might want to maintain for a long time, it usually is.

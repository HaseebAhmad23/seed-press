---
title: "I Removed a Popular Library and Nothing Broke (At First)"
description: "How I knew it was dependency bloat, not ‘best practice,’ keeping it around."
pubDate: "2025-12-18T13:27:00.000Z"
tags: ["javascript", "architecture", "technology"]
draft: false
heroImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80"
---

We had a **date formatting** helper library pulled in because one component needed locale-aware labels. Over two years it spread — copy-paste imports, “we already have it” reasoning — until **every** bundle paid for it.

## The smell test I used

1. Grep `import` across the repo.  
2. Count **real** usage vs re-exports.  
3. Check bundle analyzer for weight.  

Turns out **90%** of call sites only needed `YYYY-MM-DD` and a relative “3 days ago” string. The heavy library was doing culture-specific calendars for a product that wasn’t even multi-language yet.

## What we replaced it with

Native `Intl.DateTimeFormat` for the few locale cases, and **20 lines** of in-house helpers for the boring formats. Tests locked the behavior.

Example of the “boring” helper (simplified):

```ts
export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
```

Not clever. **Boring** is the feature.

<figure>
  <img src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80" alt="Developer working at desk with laptop" loading="lazy" width="1200" height="675" decoding="async" />
  <figcaption>Dependencies are contracts. I stopped signing ones I wasn’t reading.</figcaption>
</figure>

## What broke later

Edge case: a user in a timezone half the team forgot existed. We fixed it with an explicit test and a comment that names the TZ rule. **Still** smaller than keeping the whole library “just in case.”

---

Removing code is scarier than adding it. The trick is **proving** what you actually use — grep doesn’t lie, wishful thinking does.

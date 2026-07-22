---
title: "I Removed a Popular Library and Nothing Broke (At First)"
description: "How I figured out a date-formatting dependency was bloat, not a best practice, and replaced it with 20 lines of code."
pubDate: "2025-12-18T13:27:00.000Z"
tags: ["javascript", "architecture", "engineering"]
draft: false
heroImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80"
---

We had a heavyweight date-formatting library in our React app. It had been pulled in two years earlier because one component needed locale-aware date labels and someone’s blog post said this was The Right Library. Over the next 18 months, the import spread: copy-paste here, "we already have it" there, until basically every page in the app pulled in the full library — including pages that just needed to render `2026-03-15`.

The bundle analyzer told the story: we were shipping a lot of code for what amounted to a few date strings. Removing it took a week, taught me an annoying amount about timezones, and reduced our JS bundle meaningfully. Here’s the process I used, what broke, and what I’d do next time.

## The smell test I used

Before deciding to remove anything, I wanted data. Three questions:

**1. How many places import it?**

```bash
grep -rn "from 'datelib'" src/ | wc -l
```

(I’m using `datelib` as a stand-in name for the actual library. The principle is the same.)

The grep returned 47 imports across 31 files. That’s "ubiquitous" in our codebase.

**2. What does each import actually use?**

This is the question that mattered. I went through each import, one by one, and noted which functions it called. The summary:

- 38 imports used only `format()` with the pattern `YYYY-MM-DD`
- 6 imports used `format()` with `MM/DD/YYYY HH:mm`
- 2 imports used `formatRelative()` for "3 days ago"-style strings
- 1 import used the locale-aware calendar formatting we’d originally added the library for

So 45 of 47 imports were using a tiny subset of the library’s features. That subset is implementable in roughly 20 lines of plain JavaScript using built-in browser/Node APIs.

**3. What does the library cost?**

I ran our bundle analyzer (`vite-bundle-visualizer` for this project) and saw the library was a substantial chunk of our vendor bundle. Not catastrophic, but noticeable — and it was being loaded on every page, including marketing pages that didn’t actually need any date formatting.

## What I replaced it with

For the 38 cases that needed `YYYY-MM-DD`:

```ts
export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
```

For the 6 cases that needed locale-aware date and time:

```ts
const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDateTime(d: Date): string {
  return dateTimeFormatter.format(d);
}
```

For the 2 cases that needed relative time:

```ts
const relativeFormatter = new Intl.RelativeTimeFormat("en-US", {
  numeric: "auto",
});

export function relativeTime(d: Date): string {
  const diffMs = d.getTime() - Date.now();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (Math.abs(diffDays) >= 1) {
    return relativeFormatter.format(diffDays, "day");
  }

  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (Math.abs(diffHours) >= 1) {
    return relativeFormatter.format(diffHours, "hour");
  }

  const diffMinutes = Math.round(diffMs / (1000 * 60));
  return relativeFormatter.format(diffMinutes, "minute");
}
```

For the 1 case that needed locale-aware calendar formatting, I left the library imported — but only in that one component, dynamically loaded so it didn’t affect the main bundle. That one component genuinely needed what the library provided. The other 46 didn’t.

`Intl.DateTimeFormat` and `Intl.RelativeTimeFormat` are built into every modern browser and Node version. They handle locale-aware formatting natively, in fast C++ code that ships with the runtime. There’s no dependency to update, no security advisories to follow, no version conflicts when another library wants a different version.

## The PR that sold the removal

I’ve learned that the way you frame a removal in code review matters as much as the technical merits. My PR description had four sections:

**1. The motivation.** Bundle size diff (before/after, in actual KB), grep counts showing what we use vs. what we ship.

**2. The plan.** New utility module location, list of functions provided, mapping from old API to new.

**3. The risk notes.** "We may hit timezone edge cases the library handled for us. Here’s my test plan for the affected components. Here’s the one component that genuinely needs the library — I’m keeping it as a dynamic import."

**4. The escape hatch.** "If this breaks something I didn’t catch, the rollback is one revert. The change is mostly mechanical."

Reviewers approved it the same day. Removing dependencies is scarier than adding them, and the only way to make it feel less scary is to show your work upfront.

## What broke later

Two things broke that I hadn’t anticipated:

**1. A timezone bug in one specific user’s flow.**

A user in a less-common timezone reported that timestamps were showing the wrong day for events near midnight. Looking at the code, the issue was that I was using `toISOString()` (UTC) instead of using the user’s local timezone for the date portion. The library had been silently handling this with timezone-aware logic. My replacement wasn’t.

The fix:

```ts
export function isoDateLocal(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
```

A test was added that explicitly creates a date near midnight in a specific timezone and verifies the output. Total fix: 15 minutes once I understood the problem.

**2. A locale issue in a feature I didn’t know about.**

There was a (rarely used) admin page that displayed dates with German formatting. The library handled this transparently when the user’s locale was set to `de-DE`. My initial replacement hardcoded `en-US`. A bug was filed by an internal user, the fix was a one-liner to use the user’s configured locale instead of hardcoded English, and a regression test was added.

Both of these were predictable in hindsight. Neither was a reason to keep the original library — they were reasons to write better tests.

## The audit rhythm I now run

Once a quarter, I run a "dependency audit" on every codebase I’m responsible for. Not because I want to remove things — because I want to know what we have and why.

The audit:

1. Run the bundle analyzer. Note the largest dependencies by size.
2. For each large dependency, grep for imports. Count usages.
3. For each top-level dependency in `package.json`, ask: "if I had to defend this in code review today, could I?" If no, flag it for review.
4. Check security advisories on everything (most CI setups do this automatically — make sure it’s actually firing).
5. Remove anything obvious. Document anything that should stay but isn’t obvious why.

This isn’t a "remove dependencies for the sake of it" exercise. Some dependencies are absolutely worth their weight — a battle-tested ORM, a well-maintained validation library, a date library if you genuinely need calendar math across locales. The audit is about keeping the dependency tree intentional rather than accidental.

## When a library is genuinely the right answer

I’m not arguing for reinventing wheels. There are cases where a library is the right call:

- **Cryptography.** Never write your own. Use a well-audited library.
- **Calendar math across multiple locales.** Built-in `Intl` handles the basics; libraries handle the edge cases (different calendar systems, complex recurrence rules, etc.).
- **PDF generation, image processing, anything format-specific.** The standards are complex and the libraries encode years of edge-case fixes.
- **State management libraries** for complex apps. Rolling your own Redux is a path to pain.
- **Anything where "we’ll just write it ourselves" means writing thousands of lines of code that already exists, tested, in a maintained package.**

The smell isn’t "we have a dependency." The smell is "we have a dependency for a use case it’s an order of magnitude larger than necessary for."

## The boring takeaway

Removing code is harder than adding it. It’s scarier in code review, requires more justification, and has more "what if we need this someday" objections. But the cumulative weight of unused dependencies — in bundle size, security exposure, version conflicts, and cognitive load — is real, and someone eventually pays for it.

The trick is proving what you actually use. `grep` doesn’t lie. Bundle analyzers don’t lie. Wishful thinking ("we might need locale support some day") usually does. When the data is on your side, removal is easier to defend than addition was in the first place.

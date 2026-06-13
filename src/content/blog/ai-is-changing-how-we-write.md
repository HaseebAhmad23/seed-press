---
title: "The Code Review Comments I Find Myself Writing Most"
description: "After thousands of PR reviews, the same handful of comments keep coming up. Here are the patterns and why each one matters."
pubDate: "2026-03-28"
tags: ["code-review", "engineering", "workflow"]
draft: false
heroImage: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"
---

I keep a small text file with code review comments I’ve typed enough times to copy-paste. It started as a productivity hack and turned into something more useful: a map of the recurring places where pull requests go sideways. None of these are exotic. That’s the point — the same handful of patterns explain most of what slows reviews down or causes regressions later.

Here are the ones I write most, with the reasoning I’d want a reviewer to share with me.

## "What does this function return when the input is empty?"

I ask this on almost every PR that touches a list-processing function. The author usually answers correctly in chat — and then realizes the code doesn’t actually handle it.

Empty arrays, empty strings, `null`, `undefined`, and missing object keys are different things in most languages, and they break in different places. A function that "works on a list of users" needs an explicit answer for the empty case. Throw? Return `[]`? Return `null`? Each is defensible; silently returning `undefined` because no branch covered it is not.

The fix is usually a test, not more code:

```ts
test("returns [] when no users match", () => {
  expect(filterActiveUsers([])).toEqual([]);
});
```

Three lines. Locks the behavior. Future-proofs against the refactor where someone forgets the early return.

## "This is doing two things — can it be split?"

A function called `processOrder` that validates, charges the card, sends the email, and updates analytics is hard to test, hard to reuse, and impossible to read at 11 p.m. when something’s on fire.

I don’t ask for SOLID-grade decomposition on a small PR. I do ask: "could you split the side-effects from the decision?" Usually that means one pure function that returns what should happen, and a thin wrapper that does it. Tests get easier immediately because you can assert on the decision without mocking three services.

## "Why is this a `try/catch`?"

Wrapping things in `try/catch` because "it might throw" is one of the most common ways bugs hide. A swallowed error becomes a silently broken feature; a re-thrown error with no context becomes a Sentry mystery.

When I see one, I ask the author to answer two things in a comment in the code:

1. **What** are we expecting to fail?
2. **What** are we doing about it?

If the answer is "I don’t know" to either, the `try/catch` should probably be deleted and the error should propagate. Crashing loudly is almost always better than continuing in an undefined state.

## "Is this name doing work?"

`data`, `result`, `value`, `item`, `obj` — these aren’t variable names; they’re placeholders. Renaming a single variable from `data` to `pendingInvoices` often does more for readability than rewriting the whole function.

The same goes for booleans. `flag`, `isOk`, `done` mean nothing. `hasUnpaidBalance`, `wasRefunded`, `requiresReview` mean something. If you can’t name the boolean, you probably haven’t decided what it represents.

## "What happens if this runs twice?"

Network requests retry. Queues redeliver. Users double-click. If a function has side-effects, I want to know it’s safe to run twice — or that it’s explicitly not, and that fact is enforced somewhere.

For endpoints, the answer is usually an idempotency key. For background jobs, it’s a status check before doing the work. For database writes, it’s a unique constraint with an `ON CONFLICT` clause. There’s no universal answer, but there should always be *an* answer.

## "Where would I look for this in two months?"

This is the comment I write on file-structure decisions. A new helper in `utils/`, a new component dropped into the top-level folder, a new endpoint added to a file already 800 lines long.

Codebases get hard to navigate one "I’ll just put it here for now" at a time. The question I want the author to answer is: if a teammate joined next month and had to find this code, would the location be obvious from the name? If yes, ship it. If no, the cost of moving it later is higher than moving it now.

## "Can this query be slow?"

Any new database query gets this comment from me. Not because every query needs an index plan, but because the answer should be available.

For a small lookup by primary key, "no" is fine. For a `JOIN` across three tables filtered by a non-indexed column on a table with millions of rows, "no" needs receipts. An `EXPLAIN ANALYZE` in the PR description, the index it uses, the row count after the join. Five minutes of work that prevents a 3 a.m. page.

## "What does this test prove?"

Tests that assert implementation details rather than behavior are worse than no tests, because they create false confidence. A test that mocks every dependency and then asserts the function called `service.foo()` doesn’t prove the feature works; it proves the function calls `service.foo()`.

The question I ask: if you completely rewrote this function with a different internal structure but the same observable behavior, would the test still pass? If no, the test is checking the wrong thing.

## "Why now?"

Probably my most underrated comment. It’s for changes that aren’t broken, aren’t blocking, and don’t obviously serve the goal of the PR.

Sometimes the answer is "I was here anyway and noticed." That’s a fine answer for a small cleanup. But when the answer is "I felt like refactoring this," I ask the author to either split it into its own PR or revert it. PRs that do one thing get merged faster, get reviewed more carefully, and are easier to revert when they break.

## "This will work — should it?"

The most senior reviewers I’ve worked with ask this constantly. The code does what the ticket says. The tests pass. The PR is clean. But the broader question is: does this feature, as implemented, make the system better or worse to operate?

Adding a third way to do auth, a fourth notification channel, or a fifth admin override might solve the immediate problem and quietly worsen the codebase for everyone else. The right answer isn’t always "no" — it’s often "yes, and let’s plan to consolidate." But the question has to be asked or no one asks it.

## How I deliver these comments

Tone matters more than I’d like it to. The same point lands very differently depending on framing. A few small habits help:

- Ask questions instead of giving orders. "What happens if X?" beats "You should handle X."
- Compliment first when it’s real. "This is much clearer than the old version — one question:" goes a long way.
- Distinguish blocking from non-blocking. I prefix non-blocking nits with `(nit:)` so authors don’t feel held up by taste.
- If I’ve typed the same comment twice in a PR, the second one becomes "this comes up a lot — want to pair on it?"

The goal of a review is the same as the goal of any engineering conversation: better software, fewer surprises, and people who still want to open the next PR with me on it. Comments are a tool for all three.

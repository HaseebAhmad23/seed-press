---
title: "Take-Home Assignments That Don’t Waste People’s Time"
description: "I’ve been on both sides of the take-home. The good ones share scope, time boxes, and a clear rubric. Here’s what we changed and why."
pubDate: "2026-04-12T09:16:00.000Z"
tags: ["career", "hiring", "engineering-management"]
draft: false
heroImage: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80"
---

Take-home assignments are controversial for good reasons. They’re unpaid labor. Nervous candidates over-invest. They favor people with time on their hands. And bad ones are evaluated by reviewers who have no shared rubric, leaving outcomes effectively random.

I’ve given take-homes. I’ve done take-homes. I’ve helped a team redesign theirs after we realized the process was burning out our pipeline and not actually predicting performance. This post is what we changed, why we kept take-homes at all, and the parts I think transfer to any company that uses them.

## Why we kept take-homes

We considered scrapping them entirely. We didn’t, for one reason: they were the most reliable signal we had for "can this person actually build software," better than whiteboard interviews and at-least as good as pair-programming sessions for our roles.

The problem wasn’t take-homes as a concept. The problem was how we ran them. The bad version of a take-home is genuinely awful. The good version, in our experience, is the most respectful interview format we have — *if* you’re honest about the costs and design around them.

## What we time-box, ruthlessly

The biggest change: an explicit time cap.

> "Spend a maximum of two hours on this. Tell us where you stopped. We’d rather see a thoughtful partial solution than a polished feature that took you eight hours."

We say it in the assignment. We say it in the email. We mean it. When candidates submit and write "I spent about an hour and a half," we calibrate. When they write "I spent the whole weekend," we read the code with that context and ask them about their time-management in the follow-up.

The time box does two things:

1. **It controls the unpaid-labor problem.** Two hours is meaningful but not abusive. We can ask people to spend two hours; we couldn’t ethically ask for ten.
2. **It tests something more useful than "can you build the whole thing."** Real engineering work is constant trade-off triage under time pressure. A take-home that mirrors that produces relevant signal.

## What we scope, and what we deliberately don’t

The assignment is **one feature slice**, not a miniature product.

Bad scoping: "Build a TODO app." (Too open. Spawns endless yak-shaving on the styling and the auth.)

Better scoping: "Implement a REST endpoint `POST /items` that validates input, persists to a SQLite database we provide, and returns the appropriate response shape. Plus one GET endpoint. Plus tests."

The narrower the scope, the more comparable submissions become. We’re not evaluating "can you architect a system" with a take-home (that’s what a system-design interview is for). We’re evaluating "given a small, specific problem and a few hours, what does your code look like."

We also tell candidates what we’re *not* evaluating:

- Pixel-perfect UI (unless the role is frontend-focused, in which case we say so)
- Production-grade auth or deployment
- 100% test coverage
- "Bonus" features we didn’t ask for

This matters because conscientious candidates over-invest if you don’t set explicit guardrails. We’ve had people add Docker setups, CI configurations, and full README architectures for what was supposed to be a 2-hour exercise. That tells us nothing about whether they’re good at the actual job.

## What we hand them up front

A good take-home has these in the README:

- **Acceptance criteria as a bullet list.** Testable. Unambiguous. "POST /items with a valid body returns 201 and the created resource. POST /items with an invalid email returns 400 with `{ error: { code: 'invalid_email' } }`."
- **Seed data or a mocked API.** No "figure out how to get our staging credentials" garbage.
- **Stack guidance.** Either "use whatever you’re comfortable with" or "we’d like to see this in Python/TypeScript/whatever," but not a vague preference that the candidate has to guess at.
- **How we’ll evaluate.** "We care about readability, sensible tests, and clear trade-off comments. We don’t care about styling or perfect coverage."
- **The time box** (see above).
- **How to submit.** GitHub link, zip file, whatever — be specific.

This README is itself a quality signal. The number of companies whose take-home brief is two ambiguous paragraphs is depressing. If we expect candidates to take it seriously, we owe them a clear specification.

## How we evaluate (and how I’d like to evaluate)

We have a written rubric. Every reviewer fills it in independently before discussing with anyone else. The rubric has 5–6 dimensions (code clarity, test quality, problem-solving in edge cases, communication in comments, etc.), each rated 1–5 with anchors describing what each rating means.

Reviewers don’t see each other’s ratings until they’re submitted. Then we compare and discuss. If reviewers diverge significantly, that’s a signal to re-read more carefully, not to average out the difference.

What we explicitly avoid evaluating:

- "Culture fit" from hobby comments or personal anecdotes in the README
- Whether the candidate solved the problem the way *we* would
- Aesthetic preferences in code style that the linter doesn’t already enforce

The cleaner the rubric, the more defensible the decision. A take-home decision that comes down to "I had a gut feeling" is just expensive bias.

## The discussion after submission

We pair every take-home with a 30–45 minute conversation. This is non-negotiable. The conversation matters more than the code in our process.

In the conversation:

- The candidate walks us through their solution.
- We ask: "If you had another hour, what would you change?"
- We ask: "What trade-off did you make that you’re unsure about?"
- We ask: "Walk me through how you’d add [feature]." (Tests their understanding of their own architecture.)

The reason this matters: the code by itself doesn’t tell us whether the candidate understood what they wrote, or whether they pasted something they don’t fully grasp. A 30-minute conversation makes that distinction obvious — and it lets strong candidates demonstrate thinking that didn’t fit in 2 hours of code.

## When we skip take-homes entirely

For senior roles, especially senior IC or staff-level positions, take-homes often don’t make sense. Senior candidates have full-time jobs, families, and a long enough track record that "can you write code" is the wrong question.

For those roles, we use one of:

- **A reading exercise** — we share a small codebase and ask them to walk us through what they’d change and why. No code written.
- **A paid contract sample** — for the strongest candidates, we’ll offer a paid mini-project (e.g., one focused week of consulting work) as part of the evaluation. This is expensive but high-signal.
- **An extended pairing session** — 60–90 minutes of working together on a real problem, with the candidate driving.

The principle is the same: design for what you’re actually trying to evaluate, not what’s easy to grade.

## Feedback we try to give

After a rejection, we send feedback when we’re allowed to. Even a few sentences — "your tests were thin, your code organization was strong" — beats silence.

Legal will sometimes push back on detailed individual feedback (in some jurisdictions it creates discrimination liability if not done carefully). When that happens, I still send *process* feedback: "we loved your problem-solving, we hired for a more specific skill this round, we’d welcome you applying again in 6 months." That costs us nothing and is enormously better than a no-reply.

The candidate community talks. Companies with bad take-home reputations have measurably worse pipelines five years later. Process is brand.

## Bias checks we’re still working on

A few things we do and a few things we know we don’t do well:

**What we do:**

- Same rubric for every candidate on the exercise
- Reviewers don’t see each other’s scores until submitted
- We explicitly avoid evaluating non-relevant things (hobbies, university, personal style)

**What we’re still figuring out:**

- Time of submission probably correlates with privilege (people with childcare can submit during a weekday; people without can’t)
- "Code clarity" is partially subjective and biases toward candidates who write code that looks like *our* code
- Take-homes still favor people who already have software-engineering jobs that taught them what good code looks like, over people transitioning into the field

These aren’t solved problems. Acknowledging them is the first honest step.

## Red flags candidates notice in your process

A few things candidates have told us they noticed (and that they used to evaluate whether to accept an offer from us):

- Vague briefs that change after submission
- "We need this in 24 hours" with no business reason
- Reviewers who hadn’t read the code before the discussion call
- Ghosting after submission (genuinely the worst — the candidate spent hours; respond within a week even if the answer is no)
- Take-homes that are clearly real client work

The best engineers I’ve hired all told me later that *how* we ran the take-home was part of why they took the offer. The take-home process is a job-preview for both sides. Treat it that way.

## What I wish more companies understood

A take-home is a contract. The candidate gives you a few hours of unpaid work. In exchange, they expect:

- A clear specification
- A defined process
- Timely, honest feedback
- Their time treated as valuable

Companies that uphold their side of that contract get strong candidates who self-select in. Companies that don’t get the candidates who are desperate enough to put up with bad processes — which is rarely the talent you actually want.

The best process is the one candidates still respect after they’re rejected. That’s the real benchmark.

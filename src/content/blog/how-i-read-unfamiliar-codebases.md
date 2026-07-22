---
title: "How I Read an Unfamiliar Codebase Without Pretending to Be a Genius"
description: "A repeatable order of operations for navigating a new codebase: entrypoints first, data flow second, opinions last."
pubDate: "2026-02-03T15:40:00.000Z"
tags: ["software", "career", "engineering"]
draft: false
heroImage: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80"
---

New job, new repo, same feeling: where does anything start? I’ve joined enough teams now to know that "I’ll just read the code" is a terrible strategy. Codebases aren’t books — they don’t have a first chapter. Reading them top-to-bottom is the slowest possible way to learn what they do.

Over years of doing this badly and then slightly less badly, I’ve settled on a repeatable order of operations. It’s nothing clever, but it consistently gets me from "I don’t know what any of this is" to "I can confidently work on this module" in days instead of weeks. Here’s the playbook.

## Day 1: Find the front doors

Every codebase has entry points — the places where the outside world (a user, a job scheduler, an HTTP request, a queue message) enters the system. Until you can name them, you can’t reason about anything else.

**For an HTTP-based service**, look for:

- The router or URL configuration file
- The framework’s entrypoint (`main.py`, `app.ts`, `server.go`)
- Anything called `routes/`, `handlers/`, `controllers/`, or `endpoints/`

**For a CLI tool**, check `package.json`’s `bin` field, `pyproject.toml`’s `scripts`, or the `Dockerfile`’s `CMD`. The startup command tells you which file actually runs.

**For background workers and jobs**, look for cron definitions, queue consumer files, or scheduled task configurations.

By the end of day 1, my goal is to draw one arrow diagram on paper: request → handler → service → database. If I can’t draw it, I haven’t found all the doors yet. If I can, I have a mental map I can refine as I learn more.

I do this with a literal pen and paper, not a diagramming tool. The friction is the point — I’m forced to keep it small and only include things I’ve verified. Pretty diagrams in Excalidraw lie about your understanding.

## Day 2: Follow one happy path end-to-end

Pick the most important user action in the system. "Sign up." "Create an invoice." "Send a message." Whatever the product does, find the one action that most users perform most often.

Then trace that action from entrypoint to database write, ignoring everything else. Open the handler, follow each function call, read each query, note what gets persisted. Don’t worry about error handling, edge cases, or the seventeen feature flags that change the behavior on Tuesdays. Just the happy path.

This is the single highest-leverage exercise I do in a new codebase. By the end of day 2, I can usually answer: when a user does the most important thing this system does, what code runs and what data changes?

Once that’s clear, every other feature becomes easier to learn, because most code in most systems is a variation on a smaller number of core flows.

## Day 3: Use the tests as documentation

If the README is a marketing pitch, the tests are the actual contract. Two kinds are especially useful:

**Integration tests** spell out the assumptions the README forgot. They usually instantiate the system the way it actually runs, with real (or test-double) dependencies, and they exercise the public surface. Reading them tells you how the system is *supposed* to be used.

**Unit tests** tell you what the original author was afraid would break. The corner cases that have tests are the ones someone hit in production. A function with five test cases for the empty-list edge case has been bitten by exactly that.

I make a habit of running the test suite locally on day 3 even if I don’t plan to write a test. Watching it run gives me an unreasonably good intuition for what depends on what, where the slow paths are, and which areas are well-covered vs. which are not.

## Day 4: Find the weird stuff

Every codebase has weird stuff — modules that don’t look like the others, files with names like `legacy_`, comments that say "DO NOT DELETE," workarounds with ticket numbers. These are the parts that will hurt you later if you don’t know they exist.

I deliberately spend a day looking for them. A few good searches:

- `grep -r "TODO" .` and `grep -r "HACK" .`
- `grep -r "@deprecated" .`
- Files with the oldest commit dates (`git log --diff-filter=A --format="%ar %s" -- '*'`)
- Files that haven’t been touched in years vs. files with constant churn

The first list tells you what the team knows is broken. The second tells you what they want to remove. The third tells you what the original architecture looked like. The fourth tells you where bugs live.

## What I deliberately don’t do early

**I don’t refactor.** Not even a tiny rename. Not "just to clarify this one variable." Every refactor I’ve done in the first week of a new codebase has been wrong in some way I couldn’t see until later — usually because the naming was inconsistent for a reason I hadn’t learned yet.

**I don’t suggest a new framework, library, or pattern.** Earn your opinions first. The senior engineer suggesting Redux Toolkit on day three is the senior engineer who is wrong on day three.

**I don’t open PRs for code style.** If the team has a linter, the linter will catch what matters. If they don’t, day three is not the time to start that fight.

**I don’t skip the boring files.** `tsconfig.json`, `Dockerfile`, `docker-compose.yml`, the CI config — these are usually small and disproportionately informative. The CI config in particular often tells you what the team considers "ready to ship" vs. "experimental."

## Note-taking that doesn’t drown me

I keep one page per service or major module, with the same four bullets:

- **Entrypoint** — where requests/events enter
- **Main data stores** — what gets read and written, where
- **Weirdest dependency** — the third-party library or service that surprised me
- **On-call runbook** — link, even if there isn’t one (then I’ll add one)

If I can’t fill those four bullets within an hour of poking around, I’m still lost — which is useful information. It usually means the service has hidden dependencies (a config service nobody told me about, an external API that’s queried via an unusual path) that I need to ask about.

## When the README lies

Almost every README I’ve ever read had at least one wrong instruction. Usually it’s "run `docker compose up` and it just works," and step two of just-working involves an undocumented env var or a service that no longer exists.

The rule I’ve adopted: when the README lies, fix the lie *in the same week I find it*. Two reasons. First, future-me a month from now will remember that the README was wrong but not how to fix it. Second, the next person who joins inherits my fix instead of inheriting the lie.

If the team has a culture against updating docs, that itself is a yellow flag about the team — but in the meantime, fix what I can and move on.

## "Jump to symbol" is not cheating

I used to feel like leaning on the IDE’s "jump to definition" was somehow less rigorous than reading the file. It isn’t. The goal is to understand behavior, not to prove I can scroll through 4,000 lines without losing focus.

I lean hard on the language server when I’m learning a codebase. Cross-references, "find all usages," "go to implementation" — these turn what would be hours of grep into seconds. I still read hot paths line by line, because that’s where understanding lives. I don’t read every generated file by hand, because that’s where time goes to die.

## The one habit that beats all of the others

Talk to people. Pair with the engineer who wrote the module you’re trying to learn. Ask them to walk you through "what happens when a user does X." Take notes during the walkthrough.

A 30-minute pairing session can replace two days of solo code reading, and it has a side benefit: the engineer who walks you through their code now knows you’re seriously trying to learn it, which makes them more willing to review your first PR carefully.

The "I should be able to figure this out myself" instinct is mostly ego. Use it sparingly.

## What "I understand this codebase" looks like

I know I’ve crossed the threshold when:

- I can predict, before reading the code, roughly where a feature will live
- I can read a stack trace from production and locate the bug without help
- I know which areas of the code are "safe to change" and which require a senior eye
- I have at least one opinion about something I’d change, and I know why I’d change it

That usually takes two to four weeks of focused exposure on a mid-sized codebase. Less than a week if the codebase is small and well-organized; longer if it’s large or unusual. The point isn’t to rush it. The point is to know what you’re trying to do at each step so you’re not just staring at files hoping understanding will arrive.

Reading code is a separate skill from writing it, and one I’ve found is rarely taught explicitly. The good news is it improves with practice. The codebase that took me a month to understand five years ago would probably take a week now — not because I’m smarter, but because I have a process. I hope this version of it saves you a few of the days I wasted figuring it out the hard way.

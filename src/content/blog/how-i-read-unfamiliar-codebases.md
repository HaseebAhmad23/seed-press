---
title: "How I Read a Codebase I Didn’t Write (Without Pretending I’m a Genius)"
description: "A repeatable order of operations: entrypoints, data flow, then opinions."
pubDate: "2026-02-03T15:40:00.000Z"
tags: ["software", "career", "technology"]
draft: false
heroImage: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80"
---

New job, new repo, same panic: **where does anything start?** I stopped trying to “read it like a book” page one to end. Books don’t have seventeen `index.ts` files.

## Day 1: find the front door

- **HTTP:** router file, `main`, framework entry (`app/`, `src/pages/`, etc.).  
- **CLI:** `package.json` / `pyproject.toml` bin scripts.  
- **Jobs:** cron definitions, queue workers, `Dockerfile` `CMD`.

I draw **one** arrow diagram: request → handler → service → DB. If I can’t draw it, I haven’t found the door yet.

## Day 2: follow one happy path

Pick the core user action (“sign up,” “create invoice”). Trace it until persistence. Ignore edge cases until the happy path makes sense.

## Day 3: tests as documentation

Integration tests often spell assumptions the README forgot. Unit tests tell you **what the author feared** would break.

<figure>
  <img src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80" alt="Notebook and laptop on a desk" loading="lazy" width="1200" height="675" decoding="async" />
  <figcaption>Paper is still the best second monitor for ‘what is this module doing.’</figcaption>
</figure>

## What I deliberately don’t do early

Refactor. Rename for “clarity.” Suggest a new framework. **Earn** opinions after the map exists.

## How I take notes without drowning

One page per service: **entrypoint**, **main data stores**, **weirdest dependency**, **on-call runbook link**. If I can’t fill those four bullets in an hour, I’m still lost — and that’s useful information too.

## When the README lies

I trust runnable code over docs. If `docker compose up` fails on step two, I fix the compose or the README in the same week — otherwise the next new hire inherits the same lie. That’s team hygiene, not heroics.

## “Jump to symbol” is not cheating

Lean on LSP. The goal is **understanding behavior**, not proving you can scroll. I still read hot paths line by line; I don’t read every generated file by hand.

---

Reading code is a skill separate from writing it. The trick is **directional** reading — always know which question you’re answering next.

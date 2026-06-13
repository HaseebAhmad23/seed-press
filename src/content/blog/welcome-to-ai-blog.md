---
title: "Why I’m Writing This Blog (And What You’ll Find Here)"
description: "A short manifesto: practical engineering notes, real mistakes, no hype. Here’s what to expect and how I write."
pubDate: "2026-03-30"
tags: ["meta", "writing"]
draft: false
heroImage: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80"
---

Most engineering blogs I bookmark fall into one of two camps. The first is content marketing dressed as tutorials — "How we scaled X to 10M users" where the real story is a vendor logo at the bottom. The second is hot takes from people who haven’t shipped anything in five years. I wanted a third option: a place to write down the specific, boring, hard-won things I learn while doing the actual job.

This first post is the closest thing I’ll write to a manifesto. After this, posts get specific.

## What this blog is

Practical engineering notes. Most pieces cover one of:

- **Backend and databases** — Postgres, schema decisions, locks, migrations, query plans
- **Devops and deployment** — CI/CD pipelines, env vars, redirects, monitoring
- **API design** — versioning, error shapes, pagination, idempotency keys
- **Workflow and tooling** — Git habits, code review, editor setup
- **The job itself** — hiring, take-homes, learning new codebases

Each post is short enough to read on a coffee break but long enough to teach something concrete. The aim is "I’ll forward this to a colleague who hit the same problem."

## What this blog is not

- Listicles. ("10 React Hooks You Won’t Believe Exist.")
- Posts written to rank in search without saying anything new.
- Generic "tech is amazing" think pieces.
- Reviews of frameworks I haven’t shipped to production with.

If I can’t add a specific story, query, error message, or decision I regret, I don’t publish.

## How I decide what to write

Three filters, in order:

1. **Did I learn this the hard way?** If the answer is "yes, and I’m still annoyed," it’s usually a good topic. Pain is specific; specific is useful.
2. **Can I name the smallest example that teaches the lesson?** A 50-line snippet beats a 500-line architecture diagram for most posts.
3. **Would I have read this two years ago?** If past-me wouldn’t have clicked, present-me probably shouldn’t write it.

The Postgres migration that took down a Friday deploy? That clears all three. A post titled "Why Postgres is good"? It doesn’t.

## What you can expect from a typical post

Most posts here follow the same loose shape because it’s the shape my own notes take:

- **A short story** — what I was trying to do, what went wrong
- **The fix** — the actual change, with code or commands you could paste
- **Why it works** — one or two paragraphs, no more than necessary
- **What I’d do differently next time** — usually the most useful part

I try to keep code examples runnable or at least readable. When I have to skip details, I say so. When I’m guessing, I say that too. There is enough confident-sounding writing on the internet already.

## Why I write under my own name

It would be easier to write anonymously. Some of these posts describe mistakes that happened on real projects, and I edit details so I’m not embarrassing former colleagues or breaking confidentiality. But I sign every post for two reasons.

First, accountability. If I claim a query is fast, I should be reachable when it isn’t. The comments and contact form aren’t decoration.

Second, voice matters. Anonymous engineering writing tends to drift toward a generic "we" that no real engineer talks in. I’d rather sound like a person — including the bits where I’m wrong — than sound like a brand.

## On tools

I write posts in Markdown, edit them in a normal text editor, and push the repo to GitHub. The site is built with Astro, styled with Tailwind, and deployed on Vercel. There’s nothing exotic in the stack and no automated pipeline writing posts for me. I use modern editing tools — including AI assistants for outlining, proofreading, and the occasional rephrase — exactly the way I use a spellchecker. Every story, claim, and code sample is mine and gets reviewed before publishing.

## What I’m hoping for

The honest hope is that one of these posts saves a stranger an afternoon. That’s the bar. If I write something that helps someone avoid the migration mistake I made, or pick cursor pagination before they need it, or set up structured logs before their next outage — that’s the win. Pageviews are a nice signal; "this saved me time" emails are the actual product.

## How to read this site

Most posts stand alone. There’s no reading order. If you’re new here, a few starting points:

- Have a Postgres migration coming up? Read the one about adding a column on a Friday.
- About to design a public API? Read the API mistakes post.
- New job, unfamiliar repo? Read the "how I read a codebase" piece.

If you find an error, or you’ve solved one of these problems differently and want to push back, the [contact page](/contact) is open. Disagreement is welcome — pretending the first solution that works is the only one isn’t how anyone gets better.

That’s the manifesto. Onward to the specific stuff.

---
title: "Take-Home Assignments That Don’t Waste People’s Time"
description: "I’ve been on both sides. The good ones share scope, time boxes, and a clear rubric."
pubDate: "2026-04-12T09:16:00.000Z"
tags: ["career", "hiring", "meta"]
draft: false
heroImage: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80"
---

Take-homes are controversial for a reason: **unpaid labor** scales badly, and nervous candidates over-invest. When our team kept them, we changed **how** we ran them — not to be nicer for its own sake, but to get **signal** without burning people out.

## What we cap

- **Time box:** “Spend **two hours max**; tell us where you stopped.”  
- **Scope:** One feature slice, not a miniature product.  
- **Stack:** Default to what they know; we don’t force our exact boilerplate unless the role is that specific.

## What we give up front

- A **README** with acceptance criteria (bullet list, testable).  
- **Seed data** or a mocked API — no “figure out our staging VPN” nonsense.  
- How we’ll **evaluate**: readability, tests, tradeoffs — not pixel-perfect design unless we hire designers.

<figure>
  <img src="https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=80" alt="Handshake or professional meeting" loading="lazy" width="1200" height="675" decoding="async" />
  <figcaption>Hiring is a two-way audition; respect shows up in the brief.</figcaption>
</figure>

## Example acceptance criteria (generic)

- POST `/items` creates a row and returns `201` + body  
- GET `/items/:id` returns `404` for unknown ids  
- Basic validation error shape documented  

Boring list. **Easy to grade fairly.**

## When we skip take-homes entirely

Senior roles where public code or a **paid** contract sample makes more sense — or a deep pair-programming session if bandwidth allows.

## Feedback we try to give

Even a few sentences — “tests were thin,” “error handling was strong” — beats silence. Not every company allows detailed feedback; when legal pushes back, I still send **process** feedback (“we loved X, we hired for Y this cycle”).

## Bias checks we’re still learning

- Same rubric for every candidate on the exercise.  
- Avoid judging “culture fit” from hobby comments in the README.  
- If someone needs accommodations (extra time, different stack), say yes when it doesn’t change what you’re measuring.  

Imperfect list; still better than pretending hiring is purely meritocratic math.

## Red flags candidates notice

Vague briefs, moving goalposts after submission, ghosting for weeks. Your take-home is a **brand** touchpoint. The best engineers talk to each other.

---

The best process is the one candidates still **respect** after they’re rejected. That’s how you keep your pipeline from becoming Twitter drama.

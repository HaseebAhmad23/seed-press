---
title: "I Rewrote a 200-Line Python Script in Rust (Was It Worth It?)"
description: "Honest post-mortem: speed, DX, and the moment I missed dicts more than I expected."
pubDate: "2025-12-05T11:05:00.000Z"
tags: ["rust", "python", "performance"]
draft: false
heroImage: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&q=80"
---

The script parsed gzipped log files, aggregated counts, and spat out CSV. Python handled it fine until someone dropped a **50 GB** archive on a shared drive and asked for “by lunchtime.”

Rust wasn’t mandatory. **Curiosity** was.

## What got better immediately

**Runtime.** The Rust version streamed lines without loading whole files into memory. Same laptop, same disk — wall clock went from “go get lunch” to “wait, it’s done?”

**Single binary.** No “which venv” emails. Ship one artifact, run it.

## What hurt (real talk)

**Iteration speed.** Changing a data structure in Python is a conversation with the REPL. In Rust, the compiler is the strict friend who says “no” until you mean it.

I missed **throwing dicts everywhere** for intermediate shapes. Serde and structs are great when you know the shape; exploratory parsing felt heavier.

## Tiny example: counting by hour

Python (the gist):

```python
from collections import Counter
# ... read lines, parse timestamp, counter[hour] += 1
```

Rust (conceptually):

```rust
// HashMap<u8, u64> for hour -> count, parse with chrono, bump in loop
```

The Rust wasn’t shorter. It was **obvious** what could panic vs what couldn’t — once it compiled.

<figure>
  <img src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80" alt="Laptop showing code on screen" loading="lazy" width="1200" height="675" />
  <figcaption>Compiler green isn’t happiness; it’s the absence of a whole class of Friday surprises.</figcaption>
</figure>

## Verdict

Worth it **for this job** — heavy IO, predictable schema, needs to run on a server without Python installed.

Not worth it for **one-off glue** I’ll delete next week. Rust shines when the problem is boring and the stakes are “we run this every night.”

---

I still write Python most days. Rust is the tool I reach for when “fast enough” stopped being true.

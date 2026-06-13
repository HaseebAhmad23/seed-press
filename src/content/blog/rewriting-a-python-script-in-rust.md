---
title: "I Rewrote a 200-Line Python Script in Rust: An Honest Post-Mortem"
description: "Wall-clock speed, developer experience, packaging, and the moment I missed Python’s dicts more than I expected. Real numbers, not benchmarks."
pubDate: "2025-12-05T11:05:00.000Z"
tags: ["rust", "python", "performance"]
draft: false
heroImage: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&q=80"
---

The script in question wasn’t special. It parsed gzipped log files, aggregated event counts by hour and source, and wrote a CSV summary. About 200 lines of Python. It had been running nightly without incident for a year.

Then someone dropped a 50 GB log archive on a shared drive and asked for the same report "by lunchtime." The Python script ran fine on small files. On this one, it would have taken hours, and we needed the output in 90 minutes.

I had two options: parallelize the Python (real but ugly), or rewrite the hot path in something faster. Rust wasn’t mandatory. Curiosity, mostly, and an excuse to use the language on something other than a toy. This is the honest post-mortem of what happened, what got better, what got worse, and what I’d do differently.

## What the script does

A simplified description:

1. Walk a directory of `.log.gz` files
2. For each file, stream it line by line (decompressing on the fly)
3. Parse each line: extract timestamp, event type, source
4. Aggregate counts in memory: `(hour, event_type, source) → count`
5. Write the aggregation as CSV

Nothing exotic. The bottleneck wasn’t any single algorithm — it was the sheer volume of lines being parsed in interpreted Python, line by line.

## The Python version (rough shape)

```python
import csv
import gzip
from collections import Counter
from datetime import datetime
from pathlib import Path

def process_file(path):
    counts = Counter()
    with gzip.open(path, 'rt') as f:
        for line in f:
            parts = line.split('\t')
            if len(parts) < 3:
                continue
            ts = datetime.fromisoformat(parts[0])
            event_type = parts[1]
            source = parts[2]
            key = (ts.replace(minute=0, second=0, microsecond=0), event_type, source)
            counts[key] += 1
    return counts

def main():
    total = Counter()
    for path in Path('logs').glob('*.log.gz'):
        total.update(process_file(path))

    with open('summary.csv', 'w', newline='') as out:
        writer = csv.writer(out)
        writer.writerow(['hour', 'event_type', 'source', 'count'])
        for (hour, event_type, source), count in total.items():
            writer.writerow([hour.isoformat(), event_type, source, count])

if __name__ == '__main__':
    main()
```

On the small test data, this ran in seconds. On the 50 GB archive, the projection was over 4 hours. Not workable.

## What got better with Rust

**Wall-clock time, dramatically.** The Rust version processed the same 50 GB archive in roughly 12 minutes on the same machine. About a 20x speedup on this workload. Not because Rust is magic — because the line-by-line parsing loop in interpreted Python is genuinely slow, and Rust compiles that same loop into tight native code.

**Memory was lower and more predictable.** The Python version held a `Counter` with hundreds of thousands of keys, plus the gzip decoder’s buffer, plus interpreter overhead. The Rust version with the same shape (a `HashMap<(NaiveDateTime, String, String), u64>`) used noticeably less memory and didn’t produce the small GC pauses Python was occasionally generating on long runs.

**Single binary deployment.** After `cargo build --release`, I had one executable I could `scp` to any Linux server with no runtime dependencies. No "which venv" emails. No "do we have Python 3.11 on this box." This sounds minor until you maintain Python tooling across machines that don’t all have the same interpreter version.

**Compile-time guarantees about what could panic.** Rust forced me to handle the "what if this line doesn’t parse" case explicitly. The Python version had a silent `continue` that I’d added after seeing a few malformed lines in testing. The Rust version had to make that choice visible. Once it compiled, I was reasonably sure it wouldn’t crash on the 50 GB run — and it didn’t.

## What got worse

**Iteration speed.** Changing a data shape in Python is a conversation with the REPL: try it, see if it works, try the next thing. In Rust, the compiler is the strict friend who won’t let you ship until you’ve answered "what type is this, exactly?" When I was exploring the data and didn’t yet know the right structure, this slowed me down a lot.

In Python, I’d explore a new log format by:

```python
for line in f:
    print(line.split('\t'))
    break
```

In Rust, I’d need to define the types, set up the iterator, handle the error cases, and *then* I could print. For exploratory work, Python is still the right tool.

**Missing dicts everywhere.** Python’s habit of "just put it in a dict" is extraordinarily productive for intermediate shapes. In Rust, you’re defining structs early. For known data shapes that’s a feature (serde gives you fast, type-checked deserialization for free). For exploratory parsing, it’s heavier than it needs to be.

**Error message verbosity.** Rust’s error messages are famously detailed. That’s great when you’re learning. It’s also a lot to read when you just want to make a small change and the compiler is giving you a 40-line lecture about lifetimes.

**Build times.** Even with incremental compilation, Rust builds are slower than running a Python script. For a tight feedback loop on small changes, this matters. For a tool you build once and run on production data, it doesn’t.

## The Rust version (sketch, not complete)

The shape:

```rust
use std::collections::HashMap;
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;

use chrono::{NaiveDateTime, Timelike};
use flate2::read::GzDecoder;

type Key = (NaiveDateTime, String, String);

fn process_file(path: &Path) -> HashMap<Key, u64> {
    let file = File::open(path).expect("open");
    let reader = BufReader::new(GzDecoder::new(file));
    let mut counts: HashMap<Key, u64> = HashMap::new();

    for line in reader.lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => continue,
        };
        let parts: Vec<&str> = line.split('\t').collect();
        if parts.len() < 3 {
            continue;
        }
        let ts = match NaiveDateTime::parse_from_str(parts[0], "%Y-%m-%dT%H:%M:%S") {
            Ok(t) => t.with_minute(0).unwrap().with_second(0).unwrap(),
            Err(_) => continue,
        };
        let key = (ts, parts[1].to_string(), parts[2].to_string());
        *counts.entry(key).or_insert(0) += 1;
    }
    counts
}
```

A few things to notice:

- Explicit error handling at every fallible step (no silent `continue` — every branch is intentional)
- The `entry().or_insert(0)` pattern is the Rust equivalent of Python’s `Counter`, just more typing
- The string allocations (`parts[1].to_string()`) are deliberate — there are ways to avoid them with lifetimes, but for a first version, simplicity wins

The actual production version had better error handling, parallelism across files using `rayon`, and a proper CLI with `clap`. But the core loop is what mattered, and it’s not all that different from the Python version in structure — just typed and compiled.

## Packaging and deployment

This is where Rust gave us an underappreciated win. The deployment story for the Python version had been:

1. SSH into the server
2. Make sure Python 3.11 is installed (it usually wasn’t)
3. Create a virtual environment
4. `pip install` the dependencies (occasionally network issues)
5. Configure cron

The Rust version:

1. SSH into the server
2. `scp` the binary
3. Configure cron

The binary is `glibc`-linked, so if I move from Ubuntu 22.04 to a newer or older distribution, I might need to rebuild. For air-gapped or constrained environments, I rebuild with `musl` to get a fully statically-linked binary. None of this is hard once you know it; the first time, document it carefully so the next person doesn’t waste an afternoon.

## Testing strategy that worked

I wrote two kinds of tests:

**Unit tests for parsing edge cases.**

```rust
#[test]
fn skips_malformed_lines() {
    let result = parse_line("invalid line");
    assert!(result.is_none());
}

#[test]
fn parses_valid_line() {
    let line = "2026-03-15T10:30:00\tlogin\tweb";
    let parsed = parse_line(line).unwrap();
    assert_eq!(parsed.event_type, "login");
}
```

**A golden-file test for the full pipeline.**

I committed a small sample log file (a few hundred lines) and a known-correct CSV output. The test runs the full pipeline on the sample and diffs the output against the expected CSV. If anything changes — better or worse — the test fails and forces me to look at it.

The golden-file test caught a subtle bug where a refactor changed how I handled lines with trailing whitespace. The unit tests didn’t catch it because they were testing individual parser calls in isolation.

## Was it worth it?

For *this job*: yes, easily. The Rust version turned a 4-hour script into a 12-minute one, runs on any Linux box without dependencies, and is now part of our standard ops tooling.

For *one-off glue scripts* that I’ll delete next week: no. Python is still my default for anything throwaway. The compile-loop, the type-system tax, and the verbosity all add up when the script’s lifetime is short.

The decision rule I’ve settled on:

- **Stays as Python:** Anything written for a single use, anything exploratory, anything that runs interactively, anything where the team doesn’t already know Rust.
- **Gets considered for Rust:** Long-running, performance-sensitive, deployment-constrained, run-every-night-forever workloads. Especially if the inputs are well-typed and the data shapes are stable.

## What I’d do differently

**Prototype the data shape in Python first.** I wrote the Rust version directly because I "knew" what I wanted. I ended up restructuring twice as I learned the data better. Next time I’ll write a quick Python prototype first to nail down the shape, then port.

**Use `rayon` from the start.** I initially wrote single-threaded Rust, then added parallelism across files later. The parallelism work was straightforward but added a day. If the job is "process N independent files," start parallel.

**Don’t skip the CLI library.** I rolled my own argument parsing for the first version because it felt overkill to add `clap` for two arguments. A week later I had five arguments and was wishing I’d used `clap` from day one. Reach for `clap` immediately — it’s tiny.

## When I’d pick Go instead

If the team already standardizes on Go, or if compile times for our crate graph grew painful, I’d be honest about switching. Go would have given roughly the same wall-clock improvement, slightly faster build times, and a smaller language to learn. The reason I picked Rust over Go was personal interest in learning Rust — that’s a valid reason for a side project, but it’s a worse reason for a team decision.

Both are good answers. The bad answer is C++ for new code in 2026 unless you have a very specific reason.

## The bigger lesson

Rewriting a Python script in Rust isn’t a productivity tip; it’s a focused trade. You give up flexibility and iteration speed in exchange for runtime performance and deployment simplicity. For most code, the trade is bad. For code that runs every night, processes serious volumes, and has a stable shape, the trade is good.

I still write Python most days. Rust is the tool I reach for when "fast enough" stopped being true and the workload is going to stick around long enough to justify the upfront cost.

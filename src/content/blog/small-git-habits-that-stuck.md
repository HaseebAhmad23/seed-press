---
title: "Five Small Git Habits I Stole From Better Engineers"
description: "None of these are flashy. That’s exactly why they’ve survived two job changes and my own laziness."
pubDate: "2025-11-22T16:18:00.000Z"
tags: ["git", "workflow", "engineering"]
draft: false
heroImage: "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&w=1200&q=80"
---

I’ve read the same advanced-Git blog posts you have. Rebasing poetry, reflog rescue missions, submodules (never again). In real jobs, the tricks that survive are the tiny habits — the ones I can pull off on a bad Tuesday morning, on a project I don’t fully remember, with somebody waiting on my PR.

Here are five small Git habits I’ve stolen from better engineers over the years. None of them are clever. All of them have saved me time, embarrassment, or both.

## 1. Commit messages with a verb in the present tense

Not because a linter yells at me — because future-me reads `git log` like a diary, often six months after writing the code, often trying to remember why a line exists.

Bad: `wip`, `fix stuff`, `address review`, `final version`

Better: `fix: handle empty cart in checkout API`, `refactor: extract order validation into pure function`, `chore: bump TypeScript to 5.4`

I follow Conventional Commits loosely (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`). Strict adherence isn’t the point — the point is that someone scanning history can find what they need without opening every commit.

The format I aim for in the message body, when one is needed:

```
fix: handle empty cart in checkout API

Previously, POST /checkout with an empty cart returned 500 because
the price calculation assumed at least one item. Now returns 400
with a clear error code.

Fixes: TICKET-1234
```

A subject line under 72 characters. A blank line. A short body explaining *why* (not what — the diff is what). A ticket reference if there is one. None of this is fancy; all of it makes archaeology faster.

## 2. `git add -p` for anything non-trivial

`git add -p` (or `git add --patch`) lets you stage hunks of a file individually instead of the whole file. You see each diff, choose `y` to stage it, `n` to skip, or `s` to split it into smaller chunks.

Why this matters: it forces me to look at every change I’m committing. I cannot count how many times this has caught:

- A `console.log` I forgot to remove
- A commented-out block of code I was supposed to delete
- A test that I disabled while debugging and forgot to re-enable
- Unrelated changes from a different task that got mixed into the current branch

Yes, it’s slower than `git add .`. So is the revert at midnight when you ship a debug `print()` to production.

I use `git add -p` for any commit that touches more than one file or includes anything I wasn’t actively writing in the last 10 minutes.

## 3. Branch names that include the ticket reference

`feat/PROJ-4429-oauth-scopes` looks ugly compared to `oauth-scopes`. Six months later, when someone asks "where was that fix?" and you can `git log --all --grep="PROJ-4429"` and find it in 5 seconds — the ugliness becomes a feature.

My branch naming convention:

```
<type>/<ticket>-<short-description>

feat/PROJ-4429-oauth-scopes
fix/PROJ-5012-cart-empty-500
chore/upgrade-typescript-5.4
```

The `<type>` mirrors my commit prefix. The ticket reference makes everything searchable from many angles. The short description means I can recognize my own branches at a glance.

For projects without ticket trackers, I use the date or a tiny identifier: `fix/2026-03-empty-cart`. Anything is better than `wip-fix-thing`.

## 4. Pull with intention, never on a whim

`git pull` does two things at once: fetches new commits from the remote, and merges them into your current branch. The merge can create surprising merge commits if your local history has diverged. On a feature branch, I want a straight, readable history; on `main`, the team’s convention wins.

What I actually do:

**On my own feature branch:** `git pull --rebase`. My local commits replay on top of the latest remote state. The history stays linear. If a conflict happens, I resolve it once and continue.

**On `main` or shared branches:** Whatever the team has agreed on. If they use merge commits, I use merge commits. If they squash-merge PRs and protect `main`, I never pull directly into it — I rebase my feature branch onto the latest `main` and push there.

Configuring this as a default:

```bash
git config --global pull.rebase true
git config --global branch.autosetuprebase always
```

Now `git pull` rebases by default. If you ever need to merge instead, `git pull --no-rebase` works as an explicit override.

## 5. One logical commit per concern, before opening a PR

When I’m working, my commits look like a jazz solo: `wip oauth`, `fix typo`, `address self-review`, `actually fix it this time`. That’s fine for working. It’s not fine for the PR.

Before opening the PR, I rewrite history so each commit represents one logical change:

```bash
git rebase -i main
```

Squash the noise. Reorder if needed. Aim for 1–5 clean commits per PR, each with a clear message. The reviewer can read commit-by-commit and follow the story.

The exception: if the team explicitly wants the messy history (some teams find it useful for audit trails), I leave it alone. Fighting team conventions over Git theology is rarely the highest-value argument in any room.

## Aliases that survived every dotfile purge

I’ve had hundreds of Git aliases over the years. The ones that survived because I actually use them daily:

```bash
git config --global alias.lg "log --oneline --graph --decorate -20"
git config --global alias.s "status -sb"
git config --global alias.unstage "reset HEAD --"
git config --global alias.last "log -1 HEAD --stat"
git config --global alias.amend "commit --amend --no-edit"
```

`git lg` is the prettiest log I need day to day — last 20 commits with graph and decorations.

`git s` is a compact status — shows branch tracking info and changed files in one line each.

`git unstage <file>` does what it sounds like (the default Git syntax is `git restore --staged <file>`, which I never remember).

`git last` shows the latest commit with the changed files. Useful for "what was the last thing I did before lunch."

`git amend` adds staged changes to the last commit without changing the message. Useful for "oh I forgot one line."

I avoid more exotic aliases because I forget them under stress. Five aliases I use 50 times a day are more useful than 20 aliases I use occasionally.

## The habit I’m still bad at: deleting merged branches

My local repo accumulates branches like a hoarder’s garage. Periodically I run:

```bash
git branch --merged main | grep -v "^[ *]*main$" | xargs git branch -d
```

This deletes all local branches that have been merged into `main` (skipping `main` itself). It’s safe — it only deletes branches whose commits are already in `main`, so nothing’s lost.

I do it about once a month. I should do it weekly. If you have a better automation for this, I’d love to hear about it.

## `git bisect` paid for itself once and I’ll never forget it

`git bisect` does binary search across history to find the commit that introduced a bug. You mark a commit as "good" (works) and another as "bad" (broken), and Git checks out commits between them, asking you to test each one. With a few rounds, it finds the exact commit that broke things.

I used it once to find a regression that appeared "sometime in the last two weeks." The team had ~40 commits in that range. Bisecting took 6 checkouts, each of which I tested by running the app and reproducing the bug.

In 30 minutes, I had the exact commit. Without bisect, I would have read every diff in the range until I got lucky.

The catch: bisect only works if the bug is reproducible with a simple, deterministic test. For flaky bugs, environmental issues, or "it only happens with this specific dataset," bisect doesn’t help. For straightforward regressions, it’s magic.

```bash
git bisect start
git bisect bad                # current commit is broken
git bisect good v2.5.0        # last known good release
# Git checks out a commit in the middle.
# Test it. Then:
git bisect good      # if it works
git bisect bad       # if it’s broken
# Repeat until Git tells you the first bad commit.
git bisect reset     # return to your original branch
```

It’s the kind of feature that makes you feel grateful Git exists, the first time it pays off.

## When the team standard disagrees with my preferences

On `main`, I follow house rules. Merge commits, squash merges, conventional commits, whatever. The team’s convention exists for reasons (often historical, sometimes silly, occasionally wrong) and changing it isn’t my first-week-on-a-job battle.

On *my* feature branch, I rebase to keep the history readable. As long as the PR ends up clean, what I did locally to get there isn’t the reviewer’s problem.

Fighting about Git theology in PR comments is never the highest-value argument in the room. Ship the code. Save the Git debates for the team meeting where they belong.

## The boring takeaway

None of these habits is going to be in a conference talk. They’re the kind of thing that quietly compounds over years: cleaner history, faster archaeology, fewer "what does this branch do" conversations, and PRs that are easier to review.

If you adopt only one of them, make it `git add -p`. The number of debug `console.log`s it has saved me from shipping is, charitably, embarrassing. The number of debug logs my colleagues have caught me trying to ship is even higher. Slow down at the staging step, and most of the other Git problems get smaller.

---
title: "Five Git Habits I Stole From Better Engineers"
description: "None of these are flashy. That’s why they survived my laziness."
pubDate: "2025-11-22T16:18:00.000Z"
tags: ["git", "workflow", "technology"]
draft: false
heroImage: "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&w=1200&q=80"
---

I’ve read the same “advanced Git” blog posts you have. Rebasing poetry, reflog rescue missions, submodules (never again). In real jobs, **tiny habits** beat trick shots — the ones I could do on a bad Tuesday are the ones still here.

## 1. Commit messages with a verb in the present tense

Not because a linter yells — because *future me* reads `git log` like a diary.

Bad: `wip`  
Better: `fix: handle empty cart in checkout API`

## 2. `git add -p` for everything non-trivial

I’m allergic to shipping debug `print()`s. Staging hunks forces me to **look** at the diff. Yes, it’s slower. So is a revert at midnight.

## 3. Branch names that include the ticket

`feat/JIRA-4429-oauth-scopes` looks ugly. When someone asks “where’s that fix?” I can grep history in five seconds.

## 4. Pull with intention

`git pull --rebase` on feature branches keeps history readable. I don’t fight about merge vs rebase on `main` — team wins — but **on my branch**, I like a straight story.

## 5. One logical commit before opening a PR

Squash locally or on merge, I don’t care — but I stop dumping “address review” as seven micro-commits unless the team wants that granularity.

<figure>
  <img src="https://images.unsplash.com/photo-1556075798-4825dfaaf498?auto=format&fit=crop&w=1200&q=80" alt="Git branch visualization concept" loading="lazy" width="1200" height="675" />
  <figcaption>Branches are temporary; the story you leave in history is not.</figcaption>
</figure>

## The habit I’m still bad at

Deleting merged branches. My local repo is a graveyard. If you have a one-liner you swear by, I’m listening.

## Aliases that survived my dotfile purge

```bash
git config --global alias.lg "log --oneline --graph --decorate -20"
git config --global alias.unstage "reset HEAD --"
```

`git lg` is the only “pretty log” I need day to day. Everything fancier I forget under stress.

## When the team standard disagrees with my prefs

On `main`, I follow house rules — merge commits, squash merges, whatever ships. On **my** feature branch, I rebase to keep review readable. Fighting about git theology in PR comments is never the highest-value argument in the room.

## `git bisect` paid for itself once

Binary search between good and bad commit found a regression in **six** checkouts instead of me guessing across two weeks of history. I don’t bisect weekly, but when production is weird and tests are green, it’s the adult in the room.

---

None of this needs a conference talk. It’s the **boring** stuff that keeps a team from hating the repo — which might be the whole point.

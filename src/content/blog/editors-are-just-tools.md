---
title: "Vim, VS Code, JetBrains — The Editor Wars I’ve Stopped Caring About"
description: "I’ve been paid to write code in all three. What actually made me faster wasn’t the editor — it was learning my debugger and stopping the chair-rearranging."
pubDate: "2026-02-28T18:03:00.000Z"
tags: ["workflow", "tools", "engineering"]
draft: false
heroImage: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=1200&q=80"
---

Every few months someone posts the hot take: "real developers use X." X has been Vim, then Emacs, then Sublime, then VS Code, and lately it’s rotating through a small list of AI-augmented editors. I have shipped production code in all of them. I have switched my primary editor three times in my career. The editor never fixed my bad architecture, missed test coverage, or 2 a.m. outage.

This isn’t a "don’t care about your tools" post. It’s a "care about the right things" post. Here’s what I’ve actually noticed makes me faster, and what was just churn.

## What genuinely made me faster, in order

**1. Learning my debugger.**

I spent most of my early career being a `print()` developer. I would add `console.log("HERE")`, run the code, swear, add more logs, repeat. Then a senior engineer made me sit down with a real debugger — breakpoints, step-into, watch expressions, conditional breakpoints — and walked me through a bug I’d been stuck on for a day.

We found it in 15 minutes.

Since then I’ve invested a few hours, every new project, in setting up a proper debugger for that language. Not just "it runs" — actually configured with the right paths, working source maps, and breakpoints that don’t silently fail. The payoff has been enormous. I genuinely think this single skill made me a more productive engineer than every editor change combined.

**2. Trustworthy "jump to definition" across the whole project.**

The difference between "I think this function lives in `utils/` somewhere" and "Cmd+click takes me to it" is the difference between minutes and milliseconds. Multiplied across a day, that’s the difference between flow state and constant context-switching.

This needs:

- A language server that actually works on your project (not all of them do, especially in monorepos or projects with heavy code generation)
- Cross-file indexing that covers your dependencies, not just your own code
- Project-level "find all usages" that doesn’t miss instances because of dynamic imports

If your current setup is unreliable here, fix that before touching anything else. It’s the highest-leverage editor work you can do.

**3. Symbol rename I trust.**

The ability to rename a function or variable across the codebase with one keystroke, and *know* it didn’t miss any usages, is a force multiplier. It also reduces the friction of choosing a slightly worse name initially because "I might rename it later." If renaming is safe, you do it. If renaming is risky, you let bad names ossify.

Refactoring lives or dies on this feature working reliably. I’ve been on codebases (usually dynamically-typed, usually with significant metaprogramming) where rename wasn’t safe, and those codebases accumulated weird names like sedimentary rock.

**4. A terminal I don’t fight.**

This isn’t about which terminal — it’s about *one* terminal, integrated with my editor, where my shell history, environment, and current directory match what I expect. Switching between an external terminal window and the editor adds maybe 200ms per context switch. Cumulatively, that’s a lot.

Whether it’s VS Code’s integrated terminal, a tmux split, or whatever JetBrains calls theirs — pick one, configure it once, and stop tweaking it.

**5. Decent Git integration.**

Not because I can’t use `git` from the command line — I can, and often do — but because some operations are dramatically easier in a UI. Reviewing a diff before committing, inspecting blame on a specific line, browsing the history of a single function. These are slower in pure CLI. Especially `git add -p`, which most editor Git panels handle in a way that beats the terminal version.

## What I’ve liked about each editor

**Vim (or Neovim).**

Modal editing once it’s in muscle memory is genuinely fast for pure text manipulation. The mental load is high to get there, and the productivity benefit is real but smaller than the evangelism suggests.

Where Vim has been irreplaceable for me: SSH sessions on remote servers. When you’re editing a config file on a Linux box you may never log into again, `vim` is just there. Knowing it well enough to make non-trivial edits is a skill that earns its keep.

I don’t use Vim as my daily driver anymore — but I learned it well enough to be productive when I need it, and that has paid off many times.

**VS Code.**

For most languages, VS Code wins on extension breadth and "it just works" defaults. The language servers are usually well-maintained. The Git UI is good enough that I almost never drop to the terminal for routine Git operations. Remote SSH and dev containers are genuinely good.

The weaknesses: it can feel slow on huge codebases, the extension marketplace has some sketchy entries, and the settings sync occasionally surprises you. None of those have been deal-breakers for me.

It is my default for cross-language work, prototypes, and anything where I don’t already have a strong reason to use a different tool.

**JetBrains (IntelliJ, PyCharm, GoLand, etc.).**

For specific languages and frameworks — Java/Kotlin with Spring, Python with Django, anything with heavy framework magic — JetBrains’ deeper understanding of the framework wins. It can autocomplete things that VS Code’s language server can’t, because it knows about the framework’s conventions specifically.

Weakness: it’s heavier, more opinionated, and more expensive (though there are free editions for some). For a project where I’m in the framework all day, the productivity gain is worth it. For occasional touches of that language, it’s overkill.

## What I’ve stopped doing

**Switching editors when I’m frustrated.** Editor frustration is almost always "I have a hard problem and I’m avoiding it by reorganizing my desk." A new editor doesn’t make the bug easier. It does buy me half a day of feeling productive while learning new shortcuts.

**Hunting for the perfect color theme.** I picked one I like, set it everywhere, and stopped browsing theme galleries. Time spent on themes does not correlate with output. (Dark mode if you’re curious. Solarized Dark, specifically. I am open to argument but uninterested in having it.)

**Syncing every editor setting across machines.** I sync keybindings and a small list of must-have extensions. I deliberately don’t sync experimental settings or anything that broke a release once. Editor config is like application config — version what matters, delete the rest.

**Engaging in editor war threads.** Life is short. The people most invested in Vim-vs-VS-Code online tend to be the people producing the least actual software. Stay out of it.

## What I’d tell someone choosing their first "serious" editor

Pick one and use it for at least three months before evaluating. Most editors look bad for the first week because you’re fighting muscle memory, and look great for the second week because you’re excited about new features. Neither week is a fair test. Month three is when you find out whether the editor actually fits how you work.

After three months, the answer to "is this making me more productive?" is usually obvious. If yes, stop browsing. If no, switch once, deliberately, and commit again.

For the specific choice: if you have no other constraint, VS Code is the lowest-risk default in 2026. It works for almost every language, the community is huge, and you can always switch later. Save the editor-religion conversations for when you’ve shipped enough code to have earned them.

## The setup I currently use, for the curious

- **Daily driver:** VS Code, with language servers for TypeScript, Python, and Rust
- **Remote editing:** SSH into the box, use Neovim with a minimal config
- **Java/Kotlin projects:** IntelliJ IDEA Community
- **Database work:** A standalone tool (DataGrip currently), not the editor
- **Git operations:** Mostly CLI, but VS Code’s diff view for code review

Nothing exotic. Nothing especially clever. The interesting work happens in the code itself, not in the tool I’m typing it with.

## The one editor habit I’d recommend to anyone

Once a quarter, sit down with someone who uses a different editor than you do and watch them work for 20 minutes. You will see two or three things they do that you didn’t know were possible. Steal them. Don’t switch editors over it — just absorb the techniques.

I’ve learned more from this exercise than from any "10 VS Code tips" article. Tools are absorbed faster from peers than from blog posts. (Yes, including this one.)

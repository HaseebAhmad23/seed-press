---
title: "Vim, VS Code, and the Religion I’m Not Joining"
description: "I’ve switched editors three times. The only thing that moved the needle was learning my debugger."
pubDate: "2026-02-28T18:03:00.000Z"
tags: ["workflow", "technology", "meta"]
draft: false
heroImage: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=1200&q=80"
---

Every few months someone posts the **hot take**: real developers use X. I’ve been paid to ship code in Vim, VS Code, and JetBrains. The editor never fixed my bad architecture.

## What actually made me faster

- **Jump to definition** that works on the whole monorepo  
- **Rename symbol** I trust  
- **Debugger breakpoints** on the right process (sounds obvious; took me years to stop `print`ing)  
- A **terminal** split I don’t fight  

## What I liked about Vim (neovim, honestly)

Modal editing once it’s in muscle memory. Lightweight on a remote box. Felt cool — **relevant** when SSH is daily.

## What I liked about VS Code

Extensions for everything, decent Git UI, **low ceremony** when I’m context-switching across five languages in one week.

<figure>
  <img src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80" alt="Laptop and workspace in a cafe setting" loading="lazy" width="1200" height="675" decoding="async" />
  <figcaption>The best setup is the one you’ll actually use when you’re tired.</figcaption>
</figure>

## Hot take (mild)

Debate editors after you’ve **profiled** your slow query and **written** the test that would have caught the bug. Tools matter; **discipline** matters more.

## Remote editing reality

On a laggy SSH session, a heavy GUI might hurt more than `vim` over `mosh`. On a beefy laptop with a language server that caches well, VS Code wins for me. **Context switches** cost more than keystrokes — pick what matches the machine you’re on that day.

## Settings I sync vs settings I don’t

I sync keybindings and a short list of extensions. I **don’t** sync experimental toggles that broke a release once. Treat editor config like app config: version what matters, delete the rest.

## JetBrains in one paragraph

When the debugger understands Spring or Django magic better than a generic LSP, I’ll live inside IntelliJ for that project. I don’t need one editor religion — I need **one default** so I’m not reinstalling themes every Monday.

---

Pick one, get good enough, stop optimizing the chair while the house is on fire.

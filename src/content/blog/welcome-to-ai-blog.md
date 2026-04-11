---
title: "How I Stopped Procrastinating on My Own Blog"
description: "I got tired of never publishing. So I wired WhatsApp → n8n → GitHub and made posting as easy as texting a friend."
pubDate: "2026-03-30"
tags: ["meta", "ai", "automation"]
draft: false
heroImage: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1200&q=80"
---

Last month I caught myself doing the thing I always do: I had three half-finished drafts in Notion and zero posts live. Not because I had nothing to say — I just couldn’t be bothered to open a laptop, pick a title, and “be a blogger” for an hour.

So I did something a bit ridiculous: **I made publishing as lazy as sending a voice note.**

## The actual message I sent first

I didn’t start with a manifesto. I literally typed this into WhatsApp (typos and all):

> Topic: why I never finish blog posts  
> Keep it short, a bit self-deprecating, mention n8n and Vercel but don’t sound like a press release

About a minute later the post existed in my repo. That’s when I knew the setup wasn’t just a toy.

## What happens under the hood (no buzzwords version)

1. WhatsApp fires a webhook when I message my “blog” number  
2. **n8n** grabs the text, cleans it up, and builds a prompt  
3. **OpenAI** returns Markdown + frontmatter (title, description, tags)  
4. A **GitHub** node commits `src/content/blog/some-slug.md`  
5. **Vercel** sees the push and rebuilds the static site  

The slow part isn’t the AI — it’s usually me deciding *what* to send. The pipeline itself is routinely done in under a minute.

<figure>
  <img src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&q=80" alt="Developers collaborating at a desk with laptops" loading="lazy" width="1200" height="675" />
  <figcaption>Most of the “work” is still just deciding what you care enough to ship.</figcaption>
</figure>

## Why I didn’t use Medium

I’ve nothing against Medium, but I wanted:

- Markdown files I can grep, diff, and revert  
- My own domain and analytics story  
- No surprise paywalls in front of friends who click a link  

If the automation ever breaks, I still own the content. That matters more than I expected.

## What you’ll see here

Expect messy, useful stuff: automation, backend bits, things I broke in production, and the occasional rant. Some posts will be polished; some will read like I wrote them on the train — because I probably did.

Curious about the person behind the keyboard? **[About](/about)** has the longer version.

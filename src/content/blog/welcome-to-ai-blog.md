---
title: "Welcome to AI Blog"
description: "An introduction to this blog and the automated AI-powered workflow that publishes every post."
pubDate: "2026-03-30"
tags: ["meta", "ai", "automation"]
draft: false
---

Welcome to **AI Blog** — a blog where every post begins as a simple WhatsApp message and ends up as a fully-written, published article, all within about 60 seconds.

## The Idea

I wanted to remove every barrier between having a thought and sharing it with the world. Traditional blogging requires opening an editor, writing, formatting, reviewing, and publishing. That friction adds up, and a lot of great ideas never make it past the "I should write about that" stage.

So I built a pipeline that reduces the entire process to a single step: **send a WhatsApp message**.

## How It Works

Here's what happens when I send a message:

1. I type a topic and a few bullet points into WhatsApp
2. An **n8n workflow** receives the message via webhook
3. The topic and instructions are sent to **OpenAI's GPT** model
4. GPT generates a complete blog post in Markdown, with proper frontmatter
5. The automation commits the Markdown file to the **GitHub repository**
6. **Vercel** detects the new commit and rebuilds the site
7. The post is live on the web

The entire cycle takes about 60 seconds from message to published post.

## Why Build This?

Three reasons:

- **Lower friction**: The easier it is to publish, the more I'll write
- **Leverage AI**: GPT can turn a rough idea into a polished article in seconds
- **Full ownership**: Unlike Medium or Substack, I own every file, the domain, and the deployment

## What's Next

I'll be posting about technology, software development, AI, and whatever else crosses my mind. Since the cost of publishing is nearly zero, expect a mix of long-form deep dives and shorter thought pieces.

If you're curious about the tech stack behind this blog, check out the [About page](/about).

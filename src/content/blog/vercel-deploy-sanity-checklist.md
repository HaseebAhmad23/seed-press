---
title: "My Boring Vercel Deploy Checklist (Copy-Paste Friendly)"
description: "The stuff I verify before telling a client ‘it’s live’ — env vars, redirects, and the OG image that wasn’t."
pubDate: "2026-01-24T07:55:00.000Z"
tags: ["vercel", "devops", "automation"]
draft: false
heroImage: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80"
---

I’ve shipped enough static sites to know: **the build passing** and **the site being correct** are two different religions.

## Before merge

- `PUBLIC_*` env vars exist on **Production** *and* **Preview** if previews matter.  
- `astro.config` / `site` URL matches the real domain (canonical + OG break silently when this is wrong).  
- `robots.txt` / `sitemap` URLs aren’t still `example.com` from a template.

## After first prod deploy

- Open DevTools → **Network** → hard refresh: no mixed content on assets.  
- Hit `/rss.xml` and `/sitemap-index.xml` (or your generator’s paths).  
- Share link in Slack/Discord once — **unfurl** image and title look human.

## Real mistake I made twice

Forgot to set `PUBLIC_CONTACT_EMAIL` on Preview. Impressum page showed the default placeholder in a stakeholder demo. **Not** a career highlight.

<figure>
  <img src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80" alt="Server racks and technology infrastructure" loading="lazy" width="1200" height="675" />
  <figcaption>Hosting is ‘easy’ until the one env var you skipped is the one someone screenshots.</figcaption>
</figure>

## One-liner I keep in notes

```bash
curl -sI https://yourdomain.com | head -n 5
```

Checks TLS + redirect chain in five seconds. Boring. **Useful.**

---

Checklists aren’t lack of trust in the platform. They’re lack of trust in **me** before coffee.

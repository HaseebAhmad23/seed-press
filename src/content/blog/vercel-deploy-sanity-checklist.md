---
title: "My Boring Vercel Deploy Checklist (Copy-Paste Friendly)"
description: "The exact things I verify before telling a client a site is live — env vars, redirects, OG images, and the canonical URL that wasn’t."
pubDate: "2026-01-24T07:55:00.000Z"
tags: ["vercel", "devops", "deployment"]
draft: false
heroImage: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80"
---

I’ve shipped enough static sites to know that "the build passes" and "the site is correct" are two different religions. Vercel makes deployment effortless — which means it’s also effortless to ship something subtly broken and not notice until a client screenshots it on Slack.

This is the checklist I run through before declaring a site "live." Nothing in here is clever. The whole point is that I’ve been bitten by every single item, and writing them down means I stop relying on remembering them when I’m tired.

## Before merging the PR

These checks happen before I even think about deploying.

**1. `PUBLIC_*` env vars exist on Production *and* Preview.**

Vercel keeps Production and Preview env vars separate by default. If you set `PUBLIC_API_URL` only on Production, your Preview deploys (which is what stakeholders click on PRs) will silently use whatever your code falls back to — often a placeholder, sometimes `undefined`, occasionally a string `"undefined"` rendered in the UI.

I’ve had a client demo where the contact form showed `undefined@undefined.com` as the support email because of exactly this. Now every `PUBLIC_*` var goes into both environments by default, and we add a comment to the README listing which vars are optional.

**2. `site` URL in the Astro/Next/etc. config matches the real domain.**

This is the silent killer. The `site` value is used to generate canonical URLs, OG image URLs, sitemap entries, and RSS feed links. If it’s wrong, everything looks fine in the browser, but every shareable URL is broken and Google’s indexer sees the wrong canonical.

For Astro specifically:

```js
export default defineConfig({
  site: 'https://www.example.com', // not localhost, not a placeholder
  // ...
});
```

I have shipped sites where the canonical URL in the HTML was `http://localhost:4321` because someone copied the example config and never changed it. Google did exactly what it should: not indexed the site.

**3. `robots.txt` and `sitemap` URLs aren’t still from a template.**

Same risk, different file. Check that `public/robots.txt` references your actual sitemap URL, not `https://example.com/sitemap.xml`. Same for any hardcoded URLs in meta tags, structured data, or fallback configs.

A 30-second grep saves a week of "why isn’t Google finding our pages":

```bash
grep -rn "example.com\|localhost\|placeholder" public/ src/
```

**4. The favicon and OG default image exist at the paths the code references.**

If the OG image fallback in your code is `/og-default.png`, that file needs to live at `public/og-default.png`. A missing OG image isn’t a build error — it just makes every social share look broken. I’ve seen sites ship with a `404`-ing default image because someone renamed the file in a separate PR.

## On the first production deploy

These checks happen right after the deploy completes, before I tell anyone the site is live.

**5. Hard refresh the homepage with DevTools → Network open.**

Things I’m looking for:

- No mixed content warnings (HTTPS pages loading HTTP assets)
- No 404s in the Network tab
- All `_astro/*.css` files load with `200` status and `text/css` content type
- Fonts and images load from the expected domains

This 30-second check catches the most embarrassing class of "it works on my laptop" bugs.

**6. Hit the SEO endpoints directly.**

```bash
curl -sI https://www.yourdomain.com/sitemap-index.xml
curl -sI https://www.yourdomain.com/robots.txt
curl -sI https://www.yourdomain.com/rss.xml
```

All should return `200`. Anything else means a config issue that Google will see and you won’t notice for weeks.

**7. Share the URL in one chat and check the unfurl.**

Paste the URL into Slack, Discord, or wherever your team hangs out. The auto-generated preview should show:

- The correct title
- The correct description
- A real OG image (not a placeholder, not a 404)

This is the only reliable test for "do my Open Graph tags actually work in the wild." Each platform interprets them slightly differently, and the only ground truth is "what does this site’s scraper produce."

## Headers and security

**8. Check the response headers on the homepage.**

```bash
curl -sI https://www.yourdomain.com/ | head -20
```

What I look for:

- `strict-transport-security` is present (Vercel sets this by default)
- `x-content-type-options: nosniff` — cheap hardening
- `cache-control` looks reasonable for HTML pages (not aggressive caching for dynamic content)
- No leaked headers exposing internal infrastructure

Vercel handles most of this automatically, but I check because "default" can change between deploys if you fiddle with the config.

**9. Check the redirect chain from every host variant.**

```bash
curl -sIL https://example.com/         # apex
curl -sIL https://www.example.com/     # www
curl -sIL http://example.com/          # plain HTTP
```

Each should end at the same canonical URL with exactly one redirect (or zero, depending on your setup). I’ve been bitten by redirect loops where Vercel’s dashboard setting said one thing and `vercel.json` said the opposite, sending requests in circles until the browser gave up. Symptoms: CSS doesn’t load, blank pages, mysterious errors. Always test this.

**10. Confirm `www` vs apex behavior matches your sitemap and canonical tags.**

Pick one host as canonical (most teams pick apex these days, some pick www). Make sure:

- The other host 301-redirects to the canonical one
- Your `site` URL in the framework config matches the canonical
- Your `sitemap.xml` URLs all use the canonical host
- Your `<link rel="canonical">` tags all use the canonical host

Mismatches between these signals are the most common reason for "alternate page with proper canonical" reports in Google Search Console.

## Preview vs. Production: same brain, two configs

The mistake I’ve made twice: assuming Preview will behave like Production because the code is the same. It’s not. The env vars are different by default.

I now mirror all `PUBLIC_*` vars to Preview when stakeholders will click preview URLs. For server-side env vars, I’m more careful — sometimes Preview should hit a staging database, not production. The rule of thumb:

- **Public env vars:** mirror Preview to Production unless there’s a specific reason not to
- **Server-side env vars:** explicitly decide per variable; never blanket-copy production secrets to Preview

If a variable is optional, document that in the README. The next person to deploy shouldn’t have to guess.

## A real mistake I made twice

Forgot to set `PUBLIC_CONTACT_EMAIL` on Preview. The Impressum page showed `your-email@example.com` (the literal placeholder string from the template) in a stakeholder demo. Not a career highlight. The second time was eight months later on a different project. After the second time, the README for every project I touch has a "required env vars per environment" table.

## Domain edge cases worth testing

**Trailing slashes.** Static hosts disagree on whether `/about` and `/about/` are the same page. Astro defaults to trailing slashes; Next.js defaults to no trailing slashes. Mixed signals (some links use one, some use the other) get reported as duplicate content by SEO tools. Pick one, redirect the other, and grep your codebase to make sure all internal links match.

**Case sensitivity in URLs.** `/About` and `/about` might resolve to the same page on case-insensitive filesystems and to different responses in production. Test this if your codebase has any uppercase URLs.

**Special characters in paths.** If you have any non-ASCII characters in URLs (rare, but it happens), test them in incognito on a fresh browser. Some hosts URL-encode them, some don’t, and some servers handle the encoded vs. decoded form differently.

## The one-liner I keep in my notes

```bash
curl -sI https://yourdomain.com/ | head -n 5
```

Checks TLS, redirect chain, and basic response status in 50ms. I run it as the first action of any deploy verification because it catches "the new deploy hasn’t propagated yet" and "you forgot to update DNS" in the same command.

## What this checklist isn’t

This is a sanity checklist, not a full pre-launch QA. It doesn’t cover:

- Browser compatibility testing
- Accessibility audits (run separately, in tools designed for it)
- Lighthouse performance scores (worth checking, but a deploy issue isn’t why your LCP is bad)
- Content review (someone other than me needs to read every word)

The point is to catch the deployment-specific failures that aren’t bugs in your code but are still your fault. Boring, repeatable, takes ten minutes — and it has saved me dozens of awkward "actually the site is broken" Slack messages.

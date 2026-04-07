# Interview Preparation — AI Blog Auto-Publishing Pipeline

## 1. Elevator Pitch (30 seconds)

> I built an automated blogging platform where I send a WhatsApp message with a topic and instructions from my phone, and within 60 seconds a fully-written blog post is live on my website. The pipeline uses n8n for workflow automation, OpenAI's GPT to generate the content, GitHub as the content store, and Vercel for hosting. The blog itself is built with Astro and Tailwind CSS — it ships zero JavaScript by default, making it incredibly fast.

---

## 2. Architecture & System Design Questions

### Q: Walk me through the architecture of this project.

The system has four main components connected in a pipeline:

1. **Input (WhatsApp)** — I send a message to a WhatsApp Business number. The message contains a topic, optional writing instructions, and tags.
2. **Workflow Automation (n8n)** — n8n receives the message via a webhook from Meta's WhatsApp Business Cloud API. A Code node parses the message, an OpenAI node generates the blog post, and a GitHub node commits the Markdown file to the repository.
3. **Content Store (GitHub)** — Blog posts live as Markdown files in `src/content/blog/`. Each commit triggers Vercel's build pipeline.
4. **Hosting (Vercel)** — Vercel detects the new commit, runs `astro build` to generate static HTML, and deploys it. The post is live in about 60 seconds.

After publishing, n8n sends a confirmation back to WhatsApp with the live URL.

### Q: Why did you choose a static site approach instead of a traditional CMS like WordPress?

Three reasons:

- **Performance** — Static sites are pre-rendered HTML. No server-side processing, no database queries at request time. They load instantly and score perfectly on Core Web Vitals.
- **Cost** — Zero hosting cost on Vercel's free tier. No database to manage or pay for.
- **Automation-friendly** — Adding a new post is just committing a Markdown file to Git. No admin panel or API authentication needed for the publishing step — GitHub's API handles it.

WordPress would have worked but adds unnecessary complexity: a PHP runtime, MySQL database, plugin management, and security patching. For a blog with automated content, static generation is the ideal fit.

### Q: What happens if the OpenAI API is down or returns an error?

n8n has built-in error handling. The workflow can be configured with:

- **Retry logic** — Automatically retry the OpenAI node 2-3 times with exponential backoff.
- **Error workflow** — A separate n8n workflow triggers on failure, sending me a WhatsApp message saying the post couldn't be generated, along with the error details.
- **Draft fallback** — The workflow could be modified to commit the post with `draft: true` in the frontmatter if the quality seems off (e.g., response too short), so it doesn't appear on the site until I review it.

### Q: How would you scale this if it became a multi-author platform?

Several changes would be needed:

- **Authentication** — Map WhatsApp numbers to author profiles. The Parse Message node would look up the sender and tag the post with the correct author.
- **Approval workflow** — Add an intermediate step where posts go to a review queue (a GitHub draft PR or a `draft: true` flag) before publishing.
- **Content management** — Move from flat Markdown files to a headless CMS like Sanity or Strapi with a proper API, so multiple authors can manage content without Git conflicts.
- **Rate limiting** — Add per-user execution limits in n8n to prevent abuse.

### Q: Why n8n over Zapier or a custom Node.js server?

- **vs. Zapier** — n8n is open source and free to self-host. Zapier's free tier is extremely limited (100 tasks/month), and pricing scales steeply. n8n gives 2,500 free cloud executions or unlimited self-hosted.
- **vs. Custom code** — n8n provides a visual workflow builder, built-in error handling, retry logic, credential management, and logging. A custom Node.js server would require writing all of this from scratch, plus handling deployment and uptime.
- **Extensibility** — Adding a new step (e.g., tweet the post, send a newsletter) is drag-and-drop in n8n, not a code change + deployment.

---

## 3. Frontend & Astro Questions

### Q: Why Astro over Next.js or Hugo?

- **vs. Next.js** — Astro ships zero JavaScript by default. A blog doesn't need React hydration, client-side routing, or a full JS framework in the browser. Next.js is powerful but overkill for a content-only site. Astro builds faster and produces smaller output.
- **vs. Hugo** — Hugo is fast but uses Go templates, which are less flexible and harder to work with than Astro's component-based approach. Astro lets me use JSX-like syntax, Tailwind CSS natively, and TypeScript for content schemas.
- **Content Collections** — Astro has first-class support for typed Markdown content with Zod schemas. This means the automation's Markdown output is validated at build time — if the frontmatter is malformed, the build fails rather than showing a broken page.

### Q: Explain how Content Collections work in your project.

Content Collections are Astro's way of managing structured content. In `src/content.config.ts`, I define a `blog` collection with a Zod schema:

```typescript
const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    heroImage: z.string().optional(),
  }),
});
```

This gives me:
- **Type safety** — TypeScript knows the exact shape of every post's frontmatter.
- **Validation** — Malformed posts fail at build time with clear error messages.
- **Querying** — I use `getCollection('blog')` to fetch, filter, and sort posts.
- **Defaults** — Fields like `tags` default to `[]` and `draft` defaults to `false`, so the automation doesn't have to include every field.

### Q: How does dynamic routing work for blog posts?

The file `src/pages/blog/[slug].astro` uses Astro's `getStaticPaths()`:

```typescript
export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.map((post) => ({
    params: { slug: post.id },
    props: post,
  }));
}
```

At build time, Astro calls this function, gets all non-draft blog posts, and generates a static HTML file for each one. The `[slug]` in the filename becomes a URL parameter — so a file with `id: "my-post"` generates `/blog/my-post/index.html`.

### Q: How did you implement dark mode?

A three-layer approach to prevent flash of wrong theme:

1. **Inline script in `<head>`** — Before the page renders, a small inline script checks `localStorage` for the user's preference, falling back to `prefers-color-scheme` media query. It adds the `dark` class to `<html>` immediately, preventing any flash.
2. **Tailwind `dark:` variants** — All styling uses Tailwind's `dark:` prefix (e.g., `dark:bg-surface-950 dark:text-surface-100`).
3. **Toggle component** — A button toggles between light/dark, saves to `localStorage`, and updates the DOM class. It also listens for `astro:after-swap` to reapply the theme on client-side navigation.

### Q: How is the RSS feed generated?

It's a TypeScript endpoint at `src/pages/rss.xml.ts` using `@astrojs/rss`:

```typescript
export async function GET(context: APIContext) {
  const posts = (await getCollection('blog', ({ data }) => !data.draft))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  return rss({
    title: 'AI Blog',
    description: 'Thoughts, ideas, and stories — auto-published with AI.',
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/blog/${post.id}/`,
    })),
  });
}
```

Astro treats `.ts` files in `pages/` as API endpoints. At build time, this generates a valid XML RSS feed at `/rss.xml`.

---

## 4. API & Integration Questions

### Q: How does the WhatsApp Business API work in this context?

Meta's WhatsApp Business Cloud API uses a webhook model:

1. I register a webhook URL (my n8n instance) with Meta.
2. When someone messages my WhatsApp Business number, Meta sends a POST request to the webhook with the message payload.
3. The payload includes the sender's phone number, message type, and text content.
4. n8n's webhook node receives this and triggers the workflow.
5. To send replies, I call Meta's Send Message API with the recipient's phone number and the message body.

The free tier allows receiving unlimited messages and sending up to 1,000 business-initiated messages per month.

### Q: How do you ensure the OpenAI-generated content is well-formatted?

Through prompt engineering and post-processing:

- **System prompt** — Explicitly instructs GPT to write in Markdown, use `##` headings, not include frontmatter (added separately), aim for 800-1500 words, and use a conversational tone.
- **Frontmatter injection** — The n8n workflow wraps the AI output with YAML frontmatter containing the title, date, description (first 150 chars of content), and tags. This is deterministic — not left to the AI.
- **Build-time validation** — Astro's Zod schema validates every post at build time. If the Markdown is malformed, the build fails and Vercel doesn't deploy the broken version.

### Q: How does the GitHub commit step work via API?

n8n uses GitHub's Contents API (`PUT /repos/{owner}/{repo}/contents/{path}`):

- **File path** — Constructed from the slugified topic: `src/content/blog/{slug}.md`
- **Content** — Base64-encoded Markdown (frontmatter + AI-generated body)
- **Authentication** — A GitHub Personal Access Token with `repo` scope
- **Commit message** — Auto-generated: `blog: add post — {topic}`

This creates the file directly on the `main` branch, which triggers Vercel's deployment webhook.

---

## 5. DevOps & Deployment Questions

### Q: How does the Vercel deployment pipeline work?

1. Vercel is connected to the GitHub repository via a GitHub App integration.
2. Every push to `main` triggers a build.
3. Vercel runs `astro build`, which generates static HTML for all pages.
4. The output is deployed to Vercel's edge network (CDN).
5. The custom domain's DNS points to Vercel, so the new content is live globally.

The build takes under 1 second for this project because Astro is extremely fast and there's no server-side rendering — just static HTML generation.

### Q: What's the total cost of running this?

| Component | Cost |
|-----------|------|
| Vercel hosting | Free |
| GitHub repository | Free |
| n8n Cloud (2,500 executions/month) | Free |
| WhatsApp Business API (receiving) | Free |
| OpenAI API (GPT-4o-mini) | ~$0.01-0.05 per post |
| Custom domain | ~$10-15/year |

Total: essentially free, with a few cents per blog post for OpenAI.

### Q: How would you add CI/CD checks before publishing?

Several options:

- **GitHub Actions** — Add a workflow that runs `astro build` on every PR/push to verify the build succeeds before Vercel deploys.
- **Content linting** — Add a step that checks Markdown formatting, spell-checks, or validates frontmatter using a script.
- **Preview deployments** — Instead of committing directly to `main`, the automation could create a branch and open a PR. Vercel auto-generates a preview URL for every PR, which I could review before merging.

---

## 6. Security & Edge Cases

### Q: What security concerns exist with this pipeline?

- **WhatsApp authentication** — Only my phone number should trigger the workflow. The Parse Message node should validate the sender's number against an allowlist and reject unknown senders.
- **Prompt injection** — A malicious message could try to manipulate the OpenAI prompt. The system prompt should be hardcoded in n8n, and user input should be clearly delimited.
- **GitHub token scope** — The Personal Access Token should have minimum required permissions (only `repo` scope on the specific repository).
- **Rate limiting** — Without rate limiting, someone with the WhatsApp number could trigger many expensive OpenAI calls. n8n can throttle executions.

### Q: What if two messages arrive simultaneously and create conflicting filenames?

The slug is derived from the topic text. If two different topics happen to slugify to the same string, the second GitHub commit would fail because the file already exists. Solutions:

- Append a short timestamp or random suffix to the slug (e.g., `my-topic-2026-03-30-a1b2`)
- Use the GitHub API's "create or update" mode and add a counter to the filename
- Check if the file exists before committing and modify the slug if needed

In practice, this is extremely unlikely for a single-user blog.

---

## 7. Performance & SEO Questions

### Q: How does this site perform on Core Web Vitals?

Extremely well, because:

- **Zero JS by default** — Astro ships no JavaScript unless explicitly opted in. The only JS is a tiny inline dark mode script (~200 bytes).
- **Static HTML** — Every page is pre-rendered. No server-side rendering, no hydration delay.
- **CDN delivery** — Vercel serves pages from edge locations worldwide.
- **Optimized CSS** — Tailwind CSS v4 tree-shakes unused styles at build time.
- **Font preconnect** — Google Fonts are loaded with `preconnect` hints to minimize latency.

Expected Lighthouse scores: 95-100 across all categories.

### Q: What SEO features are built in?

- **Meta tags** — Every page has `title`, `description`, canonical URL, and `og:` / `twitter:` meta tags via the `SEO.astro` component.
- **Open Graph** — Proper `og:type`, `og:image`, `og:title`, `og:description` for rich social media previews.
- **Sitemap** — Auto-generated by `@astrojs/sitemap` at build time.
- **RSS feed** — Available at `/rss.xml` for feed readers and aggregators.
- **Semantic HTML** — Proper use of `<article>`, `<header>`, `<footer>`, `<nav>`, `<main>`, `<time>` elements.
- **Canonical URLs** — Prevents duplicate content issues.

---

## 8. Trade-offs & Decisions

### Q: What are the main trade-offs you made?

| Decision | Pro | Con |
|----------|-----|-----|
| Static site (no database) | Fast, free, simple | No real-time features (comments, likes) |
| Markdown in Git | Version controlled, automation-friendly | No rich visual editor |
| WhatsApp as input | Available everywhere, instant | WhatsApp Business API setup is complex |
| AI-generated content | Near-zero writing effort | Quality may vary, needs occasional editing |
| n8n for automation | Visual, free, extensible | Another service to manage |
| Direct commit to main | Instant publishing | No review step (by design — can be added) |

### Q: What would you do differently if starting over?

- **Add Telegram as an alternative input** — Telegram's Bot API is significantly simpler to set up than WhatsApp Business API, and could serve as a backup input channel.
- **Preview step** — Commit to a branch and generate a Vercel preview URL. Send the preview link to WhatsApp for approval before merging to main.
- **Image generation** — Add a DALL-E step to generate a hero image for each post automatically.

---

## 9. Behavioral / Soft-Skill Angles

### Q: Why did you build this project?

I wanted to solve a real problem I had: the friction of blogging. I had plenty of ideas but the process of opening a laptop, setting up an editor, writing, formatting, and deploying was enough friction that most ideas never became posts. This project reduces that to a 30-second WhatsApp message.

### Q: What was the most challenging part?

Integrating the WhatsApp Business Cloud API. Meta's developer documentation is extensive but spread across multiple pages, and the webhook verification flow (challenge-response) requires careful setup. Testing is also tricky because you need a verified Meta Business account and the sandbox has limitations.

### Q: What did you learn?

- **Workflow automation** — How to think in terms of composable, event-driven steps rather than monolithic code.
- **Astro's Content Collections** — How typed content with Zod schemas catches errors at build time rather than runtime.
- **API integration patterns** — Webhook-based event flows, dealing with API idiosyncrasies across different providers (Meta, OpenAI, GitHub).
- **Static site generation** — How static sites achieve both excellent performance and developer experience for content-heavy projects.

---

## 10. Quick-Fire Technical Facts

- **Framework**: Astro v6 (static site generator)
- **Styling**: Tailwind CSS v4 (utility-first, tree-shaken)
- **Language**: TypeScript (strict mode)
- **Hosting**: Vercel (free tier, edge CDN)
- **Automation**: n8n (open-source, webhook-driven)
- **AI**: OpenAI GPT-4o / GPT-4o-mini
- **Input**: WhatsApp Business Cloud API (Meta)
- **Content format**: Markdown with YAML frontmatter
- **Content validation**: Zod schemas via Astro Content Collections
- **SEO**: Open Graph, Twitter Cards, canonical URLs, auto-sitemap, RSS
- **Dark mode**: CSS class strategy, localStorage persistence, system preference fallback
- **Build time**: < 1 second for 12 pages
- **JS shipped to browser**: ~200 bytes (dark mode script only)
- **Total monthly cost**: Near zero (~$0.01-0.05 per post for OpenAI)

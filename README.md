# Haseeb Studio Blog — Auto-Publishing Pipeline

A personal blog powered by Astro, deployed on Vercel, with an automated pipeline that turns a WhatsApp message into a published blog post using AI.

## Architecture

```
WhatsApp Message → n8n Automation → OpenAI API → GitHub Commit → Vercel Deploy → Blog Live
```

**Flow**: Send a WhatsApp message with a topic and instructions. n8n receives it, sends it to OpenAI to generate a Markdown blog post, commits the file to this GitHub repo, and Vercel auto-rebuilds the site. New posts go live in ~60 seconds.

## Quick Start (Blog Website)

### Prerequisites

- Node.js 22+
- npm

### Local Development

```bash
npm install
npm run dev
```

The site runs at `http://localhost:4321`.

### Build

```bash
npm run build
```

### Deploy to Vercel

1. Push this repo to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Vercel auto-detects Astro — no config needed
4. Set your custom domain in Vercel dashboard
5. Update `site` in `astro.config.mjs` with your domain

## Writing Blog Posts

### Manual (via GitHub)

Create a Markdown file in `src/content/blog/` with this frontmatter:

```markdown
---
title: "Your Post Title"
description: "A short summary of the post"
pubDate: "2026-03-30"
tags: ["tag1", "tag2"]
draft: false
---

Your blog content in Markdown here...
```

**Fields:**
| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Post title |
| `description` | Yes | Short summary (used in cards and SEO) |
| `pubDate` | Yes | Publication date (YYYY-MM-DD) |
| `tags` | No | Array of tag strings (default: []) |
| `draft` | No | Set to `true` to hide from the site (default: false) |
| `updatedDate` | No | Date of last edit |
| `heroImage` | No | URL or path to a hero image |

### Editing Published Posts

1. Go to your GitHub repo
2. Navigate to `src/content/blog/`
3. Click the pencil icon on any post file
4. Edit and commit — Vercel rebuilds automatically

Works from mobile via the GitHub app or browser.

---

## Automation Setup (n8n + WhatsApp + OpenAI)

### Step 1: Set Up n8n

**Option A — n8n Cloud (recommended for simplicity)**

1. Sign up at [n8n.io](https://n8n.io) — free tier gives 2,500 executions/month
2. No setup required, runs in the cloud

**Option B — Self-hosted**

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  n8nio/n8n
```

Access at `http://localhost:5678`.

### Step 2: Set Up WhatsApp Business API

1. Go to [developers.facebook.com](https://developers.facebook.com) and create a Meta Developer account
2. Create a new app → select "Business" type
3. Add the **WhatsApp** product to your app
4. In the WhatsApp section, go to **Getting Started**:
   - You'll get a temporary test phone number
   - Add your personal phone number as a recipient
   - Send a test message to verify it works
5. Go to **Configuration** → set the **Webhook URL** to your n8n webhook URL
6. Subscribe to the `messages` webhook field

**Webhook URL format**: `https://your-n8n-instance.com/webhook/whatsapp-blog`

### Step 3: Set Up the n8n Workflow

Create a new workflow in n8n with these 5 nodes:

#### Node 1: Webhook (Trigger)

- **Type**: Webhook
- **HTTP Method**: POST
- **Path**: `whatsapp-blog`
- This receives incoming WhatsApp messages from Meta's API

#### Node 2: Parse Message (Code Node)

- **Type**: Code (JavaScript)
- Paste this code:

```javascript
const body = $input.first().json.body;
const entry = body.entry?.[0];
const message = entry?.changes?.[0]?.value?.messages?.[0];

if (!message || message.type !== 'text') {
  return [{ json: { skip: true } }];
}

const text = message.text.body;
const phoneNumber = message.from;

// Parse format: "Topic: <topic>\nInstructions: <instructions>\nTags: tag1, tag2"
const lines = text.split('\n');
let topic = text;
let instructions = '';
let tags = [];

for (const line of lines) {
  const lower = line.toLowerCase().trim();
  if (lower.startsWith('topic:')) {
    topic = line.substring(line.indexOf(':') + 1).trim();
  } else if (lower.startsWith('instructions:')) {
    instructions = line.substring(line.indexOf(':') + 1).trim();
  } else if (lower.startsWith('tags:')) {
    tags = line.substring(line.indexOf(':') + 1).split(',').map(t => t.trim()).filter(Boolean);
  }
}

const slug = topic
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const today = new Date().toISOString().split('T')[0];

return [{
  json: {
    topic,
    instructions,
    tags,
    slug,
    date: today,
    phoneNumber,
  }
}];
```

#### Node 3: OpenAI — Generate Blog Post

- **Type**: OpenAI (Chat Completion)
- **Model**: `gpt-4o` or `gpt-4o-mini` (cheaper)
- **System Prompt**:

```
You are a skilled blog writer. Write a detailed, well-structured blog post in Markdown format.

Rules:
- Do NOT include YAML frontmatter (it will be added separately)
- Start directly with the content (no title heading — it's rendered by the template)
- Use ## for section headings, ### for sub-headings
- Write in a conversational but informative tone
- Include practical examples where relevant
- Aim for 800-1500 words
- Use bullet points, numbered lists, and code blocks where appropriate
- End with a compelling conclusion
```

- **User Message** (use expressions):

```
Topic: {{ $json.topic }}

{{ $json.instructions ? 'Additional instructions: ' + $json.instructions : '' }}

Write a detailed, engaging blog post about this topic.
```

#### Node 4: GitHub — Commit File

- **Type**: GitHub (Create File)
- **Repository**: `your-username/ai-blog`
- **File Path** (expression): `src/content/blog/{{ $('Parse Message').item.json.slug }}.md`
- **File Content** (expression):

```
---
title: "{{ $('Parse Message').item.json.topic }}"
description: "{{ $json.message.content.substring(0, 150).replace(/"/g, '\\"') }}..."
pubDate: "{{ $('Parse Message').item.json.date }}"
tags: {{ JSON.stringify($('Parse Message').item.json.tags) }}
draft: false
---

{{ $json.message.content }}
```

- **Commit Message**: `blog: add post — {{ $('Parse Message').item.json.topic }}`

#### Node 5: WhatsApp — Send Confirmation

- **Type**: WhatsApp Business Cloud
- **To**: `{{ $('Parse Message').item.json.phoneNumber }}`
- **Message**:

```
✅ Blog post published!

Title: {{ $('Parse Message').item.json.topic }}
URL: https://haseebstudio.com/blog/{{ $('Parse Message').item.json.slug }}

The post will be live in about 60 seconds.
```

### Step 4: Configure API Credentials in n8n

In n8n, go to **Credentials** and add:

1. **OpenAI** — Your API key from [platform.openai.com](https://platform.openai.com)
2. **GitHub** — A Personal Access Token with `repo` scope from [github.com/settings/tokens](https://github.com/settings/tokens)
3. **WhatsApp Business** — The access token from your Meta Developer dashboard

### Step 5: Test the Pipeline

1. Activate the workflow in n8n
2. Send a WhatsApp message to your test number:
   ```
   Topic: The Future of Remote Work
   Instructions: Focus on productivity tools and async communication
   Tags: remote-work, productivity, technology
   ```
3. Wait ~60 seconds
4. Check your blog — the post should be live

### WhatsApp Message Format

**Simple** (just a topic):
```
The Future of AI in Education
```

**Structured** (with instructions and tags):
```
Topic: The Future of AI in Education
Instructions: Cover personalized learning, AI tutors, and challenges. Keep it optimistic.
Tags: ai, education, technology
```

---

## Project Structure

```
ai-blog/
├── astro.config.mjs         # Astro config (Tailwind, Vercel, Sitemap)
├── src/
│   ├── content/
│   │   └── blog/             # Blog posts (Markdown) — automation commits here
│   │       ├── welcome-to-ai-blog.md
│   │       └── ...
│   ├── content.config.ts     # Content collection schema
│   ├── components/
│   │   ├── Header.astro      # Navigation bar
│   │   ├── Footer.astro      # Site footer
│   │   ├── PostCard.astro    # Blog post preview card
│   │   ├── ThemeToggle.astro # Dark mode toggle
│   │   └── SEO.astro         # Meta tags component
│   ├── layouts/
│   │   ├── BaseLayout.astro  # Base HTML layout
│   │   └── BlogPost.astro    # Blog post layout
│   ├── pages/
│   │   ├── index.astro       # Home page
│   │   ├── about.astro       # About page
│   │   ├── blog/
│   │   │   ├── index.astro   # Blog listing
│   │   │   └── [slug].astro  # Individual post
│   │   ├── tags/
│   │   │   └── [tag].astro   # Posts by tag
│   │   └── rss.xml.ts        # RSS feed
│   └── styles/
│       └── global.css        # Tailwind + custom styles
├── public/
│   └── favicon.svg
└── package.json
```

## Cost Breakdown

| Component | Cost |
|-----------|------|
| Astro on Vercel | Free |
| GitHub | Free |
| n8n Cloud | Free (2,500 executions/month) |
| WhatsApp Business API | Free (receiving messages) |
| OpenAI API | ~$0.01–0.05 per post (GPT-4o-mini) |
| Custom domain | ~$10–15/year |

## License

MIT

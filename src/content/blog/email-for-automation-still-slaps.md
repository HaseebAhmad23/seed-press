---
title: "Why I Still Route Some Alerts Through Email"
description: "Slack is loud. PagerDuty is serious. Email is the boring pipe that never left."
pubDate: "2026-03-05T12:09:00.000Z"
tags: ["automation", "n8n", "devops"]
draft: false
heroImage: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80"
---

We have Slack bots, webhook everything, and a dashboard nobody opens. Yet **email** is still the protocol that:

- Non-dev stakeholders actually check  
- Survives “we turned off notifications for that channel”  
- Archives itself in a thread nobody has to grep  

## Example: weekly digest from n8n

Workflow sketch:

1. **Cron** Monday 8 a.m.  
2. **HTTP** to internal metrics JSON  
3. **Function** node formats a short HTML summary  
4. **Send email** (SMTP or provider node) to a mailing list  

Not clever. **Reliable.**

## When email is the wrong tool

- Real-time paging (use the proper on-call tool)  
- Secrets in subject lines (**never**)  
- Anything needing a button click to acknowledge legally — use a system built for that  

<figure>
  <img src="https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=1200&q=80" alt="Email and communication concept" loading="lazy" width="1200" height="675" />
  <figcaption>Boring infrastructure ages like oak, not like the chat app of the month.</figcaption>
</figure>

## Sample HTML snippet I reuse

```html
<h2>Weekly summary</h2>
<ul>
  <li>Failed jobs: {{ $json.failed }}</li>
  <li>Queue depth: {{ $json.depth }}</li>
</ul>
```

Variables depend on your n8n expression syntax — point is **keep the template dumb**.

---

Email isn’t sexy. **Delivered** beats sexy when finance asks “did we know about this spike?”

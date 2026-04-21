# App Capabilities

This folder contains chapters that teach **reusable app features** — patterns and integrations you can drop into any project, not just the Trial and Error app. Each chapter walks through one feature end-to-end: what it is, when to use it, and how to actually build it.

## How to use this folder

These chapters are **à la carte**. Unlike the Main Track (which builds the Eidrix-style app in a fixed order), App Capabilities can be done whenever you need the feature. Pick one when:

- You're building (or want to build) something that needs the feature
- You want to understand a common pattern before you encounter it in real work
- You're scoping out an app idea and want to know what's involved

The Main Track teaches you to build *the* app. App Capabilities teach you to build *any* app.

## What might live here

Future chapters in this folder might cover:

- User authentication (sign-in, sign-up, sessions)
- Payments (Stripe checkout, subscriptions, webhooks)
- File uploads and storage
- Email sending (transactional, marketing)
- Full-text search
- Real-time updates (websockets, server-sent events)
- Image processing and CDN delivery
- Analytics and event tracking
- Background jobs and queues
- Webhooks (sending and receiving)

## Current chapters

- **[AC-06 — Command Palette (cmd+K)](ac-06-command-palette.md)** — Build a Linear/Raycast-style command palette with cmd+K/ctrl+K trigger, fuzzy search, and a typed action system. First App Capability chapter, and the pattern foundation for AC-03 (Tool Calling) later. ~90 min. Requires Ch 8.
- **[AC-08a — The Eidrix Eye](ac-08a-eidrix-eye.md)** — The signature chapter. Build the Eidrix Eye — a living animated SVG component with six animation layers, four states (Idle / Thinking / Speaking / Muted), and seven reactions. Mounts at 24px in the chat column header and 240px in a new Brand tab. Config-driven so AC-08b's tuning playground drops in cleanly. ~4 hours. Requires Ch 9.

## Adding a new App Capability chapter

When you (or a future student) wants a chapter that doesn't exist:

1. Ask Claude Code to draft one as a small PR.
2. The chapter follows the same structural rhythm as Main Track chapters (intro, what you're learning, what you're building, glossary, step-by-step, success criteria, troubleshooting).
3. It lives at `curriculum/app-capabilities/<short-slug>.md`.
4. Add an entry to the "Current chapters" list above.
5. Add an entry to the App Capabilities section in `PROGRESS.md`.

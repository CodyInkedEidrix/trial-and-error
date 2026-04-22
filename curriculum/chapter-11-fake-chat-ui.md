# Chapter 11 — Fake Chat UI

*Main Track chapter. Your chat column is currently static — three hardcoded messages from Chapter 6, a non-functional input at the bottom. This chapter makes it live. Users can type, hit Send (or Enter), watch Eidrix "think," and see a response appear with motion. The Eye wires into the flow and reacts in real time. No AI yet — responses are a rotation of canned messages. The UI you build here is what AC-01 will plug real streaming AI into. About 2.5 hours.*

---

## What you're learning

1. **The architecture of live chat UIs** — message lists, input state, typing indicators, auto-scroll, timestamps
2. **Separating chat UI from chat backend** — building every interaction and visual behavior *before* wiring a model, so the AI chapter can focus on AI
3. **Orchestrating the Eye's reactions** — wiring Acknowledge, Processing, and Completion from AC-08a into real event-driven moments
4. **Message animation patterns** — fade-and-rise entrances, the typing-dots indicator, scroll-to-bottom on new messages
5. **Keyboard-first chat input** — Enter sends, Shift+Enter newlines, Escape clears, disabled state while "thinking"
6. **Session-only state** — why Chapter 11 doesn't persist across refreshes (and why that's intentional, with AC-04 waiting)

---

## What you're building

Your chat column becomes fully interactive:

**The message list**
- Renders all messages in order, scrolls independently of the input
- Messages fade-in with the motion language from Chapter 9
- User messages align right, Eidrix messages align left
- Each message has a timestamp, subtly visible on hover
- Empty state when no messages yet — a designed moment, not blank space
- Auto-scrolls to bottom when a new message arrives

**The input area**
- Multi-line text input that grows to a max height before scrolling internally
- Send button (using Button primary variant) — disabled when input is empty or Eidrix is thinking
- Attach file button (disabled stub — tooltip: "Coming in AC-09")
- Voice input button (disabled stub — tooltip: "Coming in AC-10")
- Enter sends, Shift+Enter inserts a newline, Escape clears the input
- Input is disabled while Eidrix is "thinking"

**The thinking state**
- After user sends, Eidrix shows a typing indicator (three breathing dots) for 800–1800ms (randomized to feel less robotic)
- Then a canned response fades in from a rotation of 8 pre-written messages
- Eye reactions fire at the right moments

**Eye integration**
- User hits Send → Eye fires **Acknowledge** reaction
- Eidrix is thinking → Eye fires **Processing** reaction (sustained)
- Response appears → Eye fires **Completion** reaction, then returns to Idle

**Session-only state**
- Messages live in React state while the tab is open
- Refreshing clears the conversation — this is intentional. AC-04 will add real persistent memory later.

---

## Why this chapter matters

Three reasons:

**1. It's the dress rehearsal for AC-01.** When AC-01 arrives, the only new piece is the Anthropic API call. Everything else — message rendering, typing states, send-on-Enter, Eye reactions, auto-scroll — already works. That lets AC-01 focus on streaming mechanics instead of UI plumbing. Every chapter that ships "the UI first, the backend second" pays itself back 3x on the backend chapter.

**2. You'll prove your AC-08a Eye reactions work for their real purpose.** You built Acknowledge / Processing / Completion as abstract reactions with manual dev triggers. This chapter wires them into actual user events. If the reactions feel right here, they're validated for real Eidrix. If they feel wrong, you find out *before* real AI is in play and the problem is harder to isolate.

**3. Chat UI is one of the places apps earn or lose premium feel.** A chat that snaps messages in instantly feels cheap. A chat that fades messages in with the right spring, shows a real typing indicator with spacing that matches your design system, and auto-scrolls smoothly feels like Linear or Claude. You're putting in the work here that users won't notice — which is exactly why they'll trust the app.

---

## Plain English glossary

- **Session-only state** — state that lives in memory only, lost on refresh. Opposite of persistent state.
- **Typing indicator** — the visual signal that the other side is responding. Usually three animated dots in a message-bubble shape.
- **Auto-scroll** — the chat automatically scrolls to the bottom when a new message arrives, so users don't have to scroll manually.
- **Debouncing** — waiting for input to settle before acting on it. Not used much in this chapter but worth knowing for text inputs generally.
- **Canned response** — a pre-written message Eidrix sends regardless of what the user said. Temporary scaffolding for this chapter; AC-01 replaces with real AI.
- **Controlled input** — a text input whose value is managed by React state rather than the browser's default. Required for features like "disable while thinking" or "clear on Escape."

---

## The plan, in plain English

1. **Start clean, branch**
2. **Thorough Plan** — message types, state architecture, Eye reaction wiring, input behavior
3. **Build the message data structures** — Message type, conversation state, helper functions
4. **Build the message list** — renders current messages with empty state and auto-scroll
5. **Build the input area** — multi-line input, Send button, stub attach/voice buttons, keyboard handling
6. **Wire the send → thinking → response flow** — with canned response rotation
7. **Wire the Eye reactions** — Acknowledge, Processing, Completion at the right moments
8. **Iterate on feel** — the chapter where timing and animations matter most
9. **Code-simplifier review**
10. **Ship**

---

## Step 1 — Start clean, branch

```
Starting Chapter 11 — Fake Chat UI. Rhythm check, then create branch feature/chapter-11-build. Read CLAUDE.md, PROGRESS.md, CURRICULUM_DESIGN.md. Skim ChatColumn.tsx for current state and EidrixEye.tsx for the reaction API you'll be driving.
```

---

## Step 2 — Ask for the Thorough Plan

```
Chapter 11 makes the chat column interactive. Users type, hit Send, Eidrix shows a typing indicator, then a canned response appears. No AI — AC-01 will swap the canned response layer for real streaming. The Eye fires Acknowledge, Processing, and Completion reactions at the right moments. Session-only state (AC-04 handles real persistence later).

Thorough-plan this.

## Scope for THIS chapter

Build:
- Message list with fade-in entrance, auto-scroll, empty state, hover timestamps
- Input area: multi-line text, Send button, disabled attach/voice buttons as stubs, Enter/Shift+Enter/Escape handling
- Canned response rotation (8 pre-written messages, randomly selected on each user send)
- Typing indicator (breathing dots, 800-1800ms duration randomized)
- Eye reactions wired: Acknowledge on send, Processing during thinking, Completion when response appears
- Session-only state (in-memory, clears on refresh)

Do NOT build:
- Real AI calls
- Conversation persistence across refreshes
- Multiple conversations / conversation picker
- File attachments or voice input (the buttons are stubs)
- Message editing or deletion

## What you propose

**Message type.** Propose the TypeScript shape. Consider: id, role (user | assistant | system maybe), content, timestamp, status (sending | sent | failed). The shape should be AC-01-compatible — design it so the streaming chapter can extend but not rewrite.

**State architecture.** One useState in ChatColumn? A reducer? Context? Remember — session-only for Chapter 11, but AC-04 will want to persist this. Design the state shape so AC-04's migration to persistent storage is mechanical, not architectural.

**The thinking flow.** User hits Send → optimistically add their message to the list → set a "thinking" state → fire Eye.Acknowledge → fire Eye.Processing (sustained) → wait 800-1800ms → pick random canned response → add Eidrix message → clear thinking state → fire Eye.Completion → Eye returns to Idle.

**Canned response roster.** Propose 8 canned responses. Make them feel like something Eidrix might actually say — warm, professional, useful-sounding. Not "Hi! How can I help you today?" — more like references to context we haven't built yet ("Once we wire up your data, I'll be able to answer that — for now here's what I'd look at..."). Self-aware that they're scaffolding is fine, even charming.

**Keyboard handling.** Enter sends (but not while empty, not while thinking). Shift+Enter inserts newline. Escape clears input. The input should auto-focus on mount.

**Auto-scroll behavior.** When a new message arrives, scroll the list to bottom. But: if user has scrolled up to read history, don't force-scroll them back down. Only auto-scroll if they're already near the bottom. This is the "Slack rule" and it's non-negotiable.

**Empty state.** When messages is empty, render something designed. Current hardcoded messages from Chapter 6 can be the empty-state content, or we build something new — propose which.

## Eye reaction integration

The Eye is already mounted in the chat column header. It accepts a `reaction` prop that fires a one-shot. Propose:

1. How the ChatColumn communicates with the Eye — prop drilling, context, event bus? The Eye is currently mounted in the column header — is that still the right place, or does it need to move into a position that makes reactions feel connected to messages?

2. Acknowledge timing — fires immediately on user Send. Should complete before the user's message finishes its fade-in, or concurrent?

3. Processing is a *sustained* reaction, not a one-shot. How does it start when thinking begins and end when response appears? The AC-08a reaction system was designed for one-shots. If Processing doesn't fit cleanly, flag it — we may need to treat Processing as a state instead of a reaction.

4. Completion fires when response appears. Does it overlap with the response's fade-in, or come after?

## Architecture questions

1. Should the typing indicator be a "message" in the message list (same type, status: thinking), or a separate UI element? This affects how auto-scroll works and how the indicator positions.

2. Send button disabled when input is empty OR when Eidrix is thinking. Confirm the plan handles both.

3. Randomized thinking duration — where does the randomization happen? In the state reducer, or in a helper function? Either is fine, just pick one.

4. The Chapter 6 hardcoded messages — preserved as initial state, migrated to the empty state, or dropped? Propose which and why.

## Edge cases

At least 5:
- User sends multiple messages rapidly before first thinking completes
- User hits Enter on empty input
- Input is extremely long (auto-grow hits max height)
- User scrolls up mid-conversation to read history, a new response arrives
- User switches tabs away during thinking, comes back after response has arrived
- Reaction fires on an unmounted Eye (if user switches to Brand tab while thinking)

## Assumptions, risks, open questions

Plan, don't build. Wait for approval.
```

---

## Step 3 — Review the plan carefully

Things worth pushing back on:

- **Message type should be AC-01-ready.** If it's overly tied to "canned response" thinking (e.g., a `cannedIndex` field), that's short-sighted. The shape needs to work for streaming chunks later.
- **State architecture should be AC-04-ready.** If the plan picks a pattern that'll need rewriting when persistent memory lands, push for a shape that swaps backends mechanically. Same principle as Chapter 10's store.
- **Processing-as-reaction feels wrong.** If the plan treats Processing like the others, flag it. Sustained reactions are a different API than one-shots. Either:
  - The Eye gets a new `sustainedReaction` prop for multi-duration reactions
  - Processing becomes a state modifier, not a reaction
  - The Eye's Thinking state gets used instead of a Processing reaction

  Any of those is fine — Claude Code just needs to pick one and defend it.
- **Auto-scroll rule must be the Slack rule.** Force-scrolling users back to bottom when they've scrolled up to read is unforgivable UX. If the plan doesn't specify the "only scroll if near bottom" behavior, push for it.

When solid:

```
Plan approved. Start with message types, state architecture, and the canned response roster. Stop before building the message list UI — show me the data layer and roster first.
```

---

## Step 4 — Review the data layer and responses

Eyeball the Message type, the state shape, and especially the 8 canned responses. If any response lands wrong — too generic, too AI-chatbot, too cheerful — replace it now. The responses are what users will actually read while using Chapter 11. They're not throwaway.

Canned responses are also branding. If they sound like a generic ChatGPT clone, your chat reads as generic-ChatGPT-clone. If they sound like Eidrix — a little dry, useful, grounded — the chat reads as yours.

When the responses land:

```
Data layer and responses look right. Build the message list with entrance animation, auto-scroll, and empty state. Stop before the input area.
```

---

## Step 5 — Review the message list

At this point you should see current messages render, fade-in when state changes manually, and an empty state when no messages exist. Try:

- Manually add a message via React DevTools or a temporary test button — does it fade in smoothly?
- Add 30 messages quickly — does auto-scroll keep up?
- Scroll up manually — does the list stay where you scrolled to?

```
Message list feels right. Build the input area — multi-line input, Send button, stub attach/voice buttons, keyboard handling. Stop before wiring the send flow.
```

---

## Step 6 — Review the input area

The input should:
- Auto-focus on mount
- Grow as you type multi-line, capped at a max height
- Send button disabled when empty
- Enter triggers Send (not yet wired to actually send), Shift+Enter adds newline, Escape clears input
- Stub buttons for attach and voice show tooltips on hover

If the input feels right:

```
Input looks good. Wire the full send → thinking → response flow with canned response rotation, and wire the Eye reactions (Acknowledge, Processing, Completion) at the right moments.
```

---

## Step 7 — Test the full flow

This is where it should start feeling alive.

**Send a message.** You should see:
1. Your message appears instantly, fades in
2. The Eye does the Acknowledge flick toward the chat (or wherever your plan positioned it)
3. Typing indicator appears (three breathing dots)
4. The Eye goes into Processing (sustained, not a one-shot)
5. 800–1800ms later, a canned response fades in
6. Typing indicator disappears
7. The Eye fires Completion, then settles back to Idle
8. Input auto-focuses again, ready for next message

Send several messages in a row. Try rapid-fire. Try sending while Eidrix is thinking. Try sending on an empty input (Send button should be disabled — verify).

**Reaction timing feels right?**
- Does Acknowledge feel like the Eye saw your message, or like a random twitch?
- Does Processing feel like concentration, or like the Eye is stuck?
- Does Completion land on the response arrival, or late?

If any of those feel off, iterate with specific language:

```
The Acknowledge reaction is firing after my message finishes animating in. It should fire at the same moment I hit Send, before or during my message's fade-in.
```

```
Processing looks identical to Thinking state. They're supposed to be different — Processing is sustained attention, Thinking is inward focus. Push the visual difference.
```

```
Completion fires before the response finishes fading in — looks like the Eye is celebrating nothing. Delay Completion until the response has visually landed.
```

---

## Step 8 — Iterate on feel

Chapter 11's iteration is mostly about *timing*. Specific things to polish:

- **Typing indicator duration.** 800–1800ms randomized is the starting range. If responses feel too instant, widen to 1000–2400ms. If they feel sluggish, narrow to 600–1400ms. There's a real sweet spot here — too fast and it's not believable, too slow and the app feels tired.
- **Typing indicator itself.** Three dots breathing. Does it match the breathing Eye? It should — they're family, not strangers. If the dots feel mechanical and the Eye feels alive, they're out of sync and one needs to change.
- **Response entrance.** Quick fade-in (200ms)? Or slow (400ms)? The Eidrix tempo you dialed in at Chapter 9 said "slow to move, fast to respond." Responses are "arriving" — they should feel patient, not snappy.
- **Empty state.** Does it invite users to type, or does it sit there silent? A one-line prompt like "Try asking about your records" or "Eidrix is ready — what's on your mind?" lands warmer than no text.
- **Input disabled state during thinking.** Is it visually obvious the input is locked? Or does it look broken? If the user tries to type during thinking, no response should create the impression the app is frozen.

---

## Step 9 — Code-simplifier review

```
Chapter 11 is live. Have code-simplifier review ChatColumn.tsx and the new chat-related files. Report suggestions, don't auto-apply.
```

Accept cleanups within files. Be skeptical of suggestions that merge the chat state into a generic "conversation infrastructure" — AC-04 will handle that properly; don't build it halfway now.

---

## Step 10 — Ship

```
Ready to ship. Commit, check off Chapter 11 in PROGRESS.md in the same commit, push, open PR.
```

Merge, clean up.

---

## What just happened

You built a complete chat UI. Every interaction, every animation, every state. The only missing piece is real AI — which is a three-line code change in AC-01.

More importantly, you validated the AC-08a Eye reaction system in its intended use case. The Eye was built abstractly. Chapter 11 is the first time the reactions fired because of real user events, not dev buttons. If they felt right, the system is proven. If they felt off, you have targeted feedback for AC-08b tuning or AC-08a patches — way more useful than abstract "does this reaction feel good in isolation" testing.

And you proved the separation pattern: *UI first, backend second.* The same logic applies to Chapter 10 (localStorage → Supabase in Chapter 13) and will apply to every future chapter that has a UI/backend split. Get the shape right in the UI; swap the backend when the shape is stable.

---

## What success looks like

- User can type a message, hit Send or Enter, see it appear
- Eidrix shows a typing indicator for a variable duration, then replies with a canned response
- Messages fade in with the Eidrix motion tempo
- Empty state renders when there are no messages
- Auto-scroll keeps the latest message visible, but doesn't hijack user scroll
- Send button is correctly disabled when empty or thinking
- Enter sends, Shift+Enter adds newline, Escape clears
- Attach and voice buttons are visibly present but disabled with "coming soon" affordance
- Eye fires Acknowledge on Send, stays in Processing during thinking, fires Completion when response arrives
- Refreshing the page clears the conversation (intentional — AC-04 handles persistence later)
- PR merged, branch cleaned up, PROGRESS.md updated

---

## If something broke

- **"Messages appear instantly with no animation"** — entrance animation not wired. Tell Claude Code: *"Messages are snapping in instead of fading. Apply the Chapter 9 entrance pattern (fade + rise, Eidrix tempo) to new messages."*
- **"Typing indicator feels mechanical"** — dots aren't breathing right. Tell Claude Code: *"The typing indicator dots look like metronomes. Match them to the Eye's breath — same rhythm, same irregularity."*
- **"Auto-scroll hijacks me when I'm reading history"** — Slack rule not implemented. Tell Claude Code: *"Scrolling up to read old messages gets hijacked when a new message arrives. Implement the 'only auto-scroll if user is near bottom' rule."*
- **"Eye reactions don't fire"** — wiring missing. Tell Claude Code: *"The Eye isn't reacting to chat events. Trace the reaction prop from chat state through to the Eye component — something's not connected."*
- **"Eye Processing state never ends"** — sustained reaction lifecycle not cleaned up. Tell Claude Code: *"The Processing state sticks even after the response arrives. The Processing-to-Completion transition isn't firing cleanly."*
- **"Input doesn't auto-focus"** — ref or effect missing. Tell Claude Code: *"The input doesn't auto-focus on mount or after send. Add the focus behavior."*

---

## Tour Moment — The "UI first, backend second" pattern

You've now done this three times: Chapter 6 built the shell before knowing what tabs would exist. Chapter 10 built CRUD with localStorage before knowing Supabase would replace it. Chapter 11 built chat UI before knowing real AI would plug in.

The pattern: **write the shape of the interaction before committing to the backend that drives it.** This works because:

- **UIs are 10x harder than integrations.** A model call is three lines. A good chat UI is 500. If you build both at once, the UI steals all the time and the integration gets rushed.
- **UIs stabilize slower than integrations.** Swapping Supabase for a different database is a day's work. Redesigning chat message layouts after users are using them is weeks.
- **UIs surface product questions early.** Building the chat input for Chapter 11 forced a decision about Shift+Enter vs plain Enter, disabled states during thinking, attach button placement. Those decisions influence AC-01's design. Making them in Chapter 11 when they're cheap, not AC-01 when they're load-bearing.

Use this pattern whenever you face a feature with both UI and backend components. Ship the UI first, mock the backend with hardcoded data, swap the backend once the UI is stable.

---

## Tour Moment — Canned responses as branding

The 8 canned responses you shipped aren't throwaway. They're the voice of Eidrix talking to a user for the first time. If they sound like ChatGPT, Eidrix sounds like ChatGPT. If they sound like Linear's empty-state copy, Eidrix sounds like Linear.

Voice patterns worth watching in future AI work:

- **Avoid eager cheerfulness.** "I'd be happy to help!" is an AI smell. Eidrix is dry and useful, not enthusiastic.
- **Acknowledge limitations honestly.** When Eidrix doesn't know something, say so directly. "I don't have that data wired up yet" reads more trustworthy than "Let me see what I can find!"
- **Reference the operator's work, not your own capabilities.** "Once we've got your customers synced, here's how I'd think about that" sounds like a collaborator. "I can help you with customer insights!" sounds like marketing copy.

When AC-01 wires real AI, these patterns become the system prompt. Your canned responses here are the tone-of-voice spec for the real Eidrix AI later.

---

## Tour Moment — Session-only state and why it's fine

You probably noticed: refreshing the page wipes the conversation. That feels wrong in 2026 when every app claims persistence. But it's the right call for this chapter.

Three reasons:

1. **AC-04 is the right home for this.** Agent Memory and conversation persistence are its own meaningful capability. Stealing that thunder here makes AC-04 feel redundant.

2. **Architecture clarity.** The state you built is self-contained in React state. Swapping it for a persistent store later is a mechanical change. Building persistence now would mean deciding storage shape before AC-04 informs that decision.

3. **Honest scaffolding.** The chat UI is scaffolding for AC-01. Adding features around scaffolding (persistence, multiple conversations, editing) inflates scope for little payoff. Keep Chapter 11 narrow; let later chapters add depth.

The rule worth internalizing: **don't build features into scaffolding.** Scaffolding exists to hold the shape of a real thing. Features belong in the real thing. Chapter 11 is scaffolding for AC-01 + AC-04.

---

## Next up

**Chapter 12 — Deploy It.** First deployment milestone. You've built enough to put on a real URL. Vercel or Netlify, custom domain if you want one, everything live for anyone to visit. Lightweight chapter but meaningful — Trial and Error stops being a local project and becomes something you can share.

Or: **AC-11 — Optimistic UI & Loading States.** Polishes Chapters 10, 10.5, and 11 with skeleton loaders, optimistic updates, smooth error states. Pairs naturally with fresh CRUD and chat work.

Or skip ahead: **Chapter 13 — Environment Variables.** Prep for real backend work. Tiny chapter. Unlocks AC-01 (Streaming Chat) which is where this whole UI gets plugged into real AI.

My lean: Chapter 12 — Deploy It. You've got something worth showing off now. Deploying it makes it real in a way local dev doesn't.

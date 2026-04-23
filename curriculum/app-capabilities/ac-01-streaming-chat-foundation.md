# AC-01 — Streaming Chat Foundation

*App Capability. The one you've been waiting for. The canned responses in your chat column are getting replaced with real streaming Claude. Every message you type sends to Anthropic's API through the Netlify Function you built in Chapter 13, and real tokens stream back into the chat as Claude types. The Eye's reactions fire for real AI events. After this chapter, Trial and Error is actually AI-powered. About 3.5 hours.*

---

## What you're learning

1. **Server-Sent Events (SSE) and streaming** — how AI responses come back token by token rather than all at once, and why that matters
2. **The Anthropic Messages API** — request shape, response shape, system prompts, message arrays
3. **Streaming from the server side** — reading an SSE stream in a Netlify Function
4. **Streaming to the client side** — consuming an SSE stream in the browser and updating UI as tokens arrive
5. **Incremental state updates during streaming** — the pattern that makes responses appear to type themselves
6. **Error handling across the full stack** — network failures, rate limits, API errors, malformed responses
7. **The full end-to-end AI request cycle** — browser → your function → Anthropic → your function → browser

---

## What you're building

The chat column becomes real AI:

**Server side: `netlify/functions/chat.ts`**
Replaces the health-check stub. Takes a message array from the browser, sends it to Anthropic's Messages API with streaming enabled, pipes the response stream back to the browser.

**Client side: streaming message handling**
Browser sends the message array, receives tokens as they stream, updates the in-progress assistant message character by character, finalizes when the stream completes.

**Eye reactions wired to real events**
- Acknowledge fires on user send (unchanged from Chapter 11)
- Processing fires when the stream starts (unchanged)
- Completion fires when the stream ends — but now it's "the AI actually finished" not "1800ms passed"
- Uncertainty fires if the stream errors out — new wiring, new feel

**System prompt baked in**
A short system prompt identifies Claude as Eidrix, frames the context (business operations assistant, small business owners, etc.). Lives in the function for now — we'll externalize it later.

**Canned responses deleted**
The Chapter 11 canned response array and rotation logic gets removed cleanly. No dead code.

**Error states**
Visible, designed error messages in the chat when things go wrong: API unreachable, rate limited, invalid key, streaming interrupted.

---

## Plain English glossary

- **Server-Sent Events (SSE)** — a web standard for servers to push a stream of data to a browser over a single HTTP connection. Different from WebSockets (two-way). Used for AI streaming because it's simpler and the data only flows one direction.
- **Token** — the smallest unit of text an AI produces. Roughly a word, or a chunk of a word. "Hello world" might be 2-3 tokens.
- **Streaming** — receiving the response in pieces as it's generated, rather than waiting for the entire response before showing anything. Makes AI feel responsive.
- **Messages API** — Anthropic's primary endpoint for chat. You send a list of messages (user and assistant turns), and it generates the next assistant turn.
- **System prompt** — the instructions that tell Claude who it is, what it's doing, how to behave. Not part of the conversation visible to the user, but shapes every response.
- **Conversation history** — the array of past messages in the current chat session, sent with every new request so the AI "remembers" what was said.
- **Stream chunk** — a piece of data arriving from the stream. For Anthropic, each chunk is typically a small JSON object representing a token or event.
- **Stream event** — a named type of chunk in the stream (e.g., `content_block_delta` for new tokens, `message_stop` for end-of-response).
- **Client-side** — browser code. What your React components do.
- **Server-side** — the Netlify Function. Where the API key lives and where the Anthropic call happens.

---

## Why this chapter matters

Three reasons:

**1. It's the first chapter where your app actually does something intelligent.** Every interaction before this was deterministic — you click X, the app does Y. AC-01 introduces nondeterminism: you type, and something thinks about what you said, and responds in whatever words it chooses. That's a different class of software. Apps that can think are the point of everything you've been building toward.

**2. The streaming pattern transfers to every future AI chapter.** AC-02 (Context-Aware), AC-03 (Agentic Foundation), AC-04 (Memory), AC-05 (Multi-Turn Loops), AC-16 (Subagents) — all of them build on the streaming foundation from this chapter. Get the streaming right here, and everything downstream is an incremental addition. Get it wrong, and every future chapter fights a bad foundation.

**3. Streaming is what separates "good enough" AI apps from great ones.** Apps that wait for the full response and show it all at once feel sluggish, even if they're objectively fast. Apps that stream tokens feel alive, even when they're slower. The perception difference is huge. Every AI app you actually enjoy using (Claude.ai, Cursor, Perplexity, v0) streams. Amateur AI apps don't. You're about to be in the "does it right" camp.

---

## The plan, in plain English

1. **Start clean, branch**
2. **Thorough Plan** — streaming architecture is nontrivial, worth planning carefully
3. **Update the Netlify Function** — swap health-check for real Anthropic streaming
4. **Test the function directly** via curl — prove server side streams before touching browser code
5. **Build the client-side streaming reader** — consume the stream, update React state incrementally
6. **Wire the streaming reader into ChatColumn** — replace canned response logic with real streaming
7. **Delete the old canned response code**
8. **Wire Eye reactions for real events** — Acknowledge, Processing (during stream), Completion (on end), Uncertainty (on error)
9. **Error handling** — all the failure modes with designed UI states
10. **Iterate on feel** — streaming speed perception, reaction timing with real token arrival
11. **Code-simplifier review**
12. **Ship**

---

## Step 1 — Start clean, branch

```
Starting AC-01 — Streaming Chat Foundation. The big one. Rhythm check, then create branch feature/ac-01-build. Read CLAUDE.md, PROGRESS.md, CURRICULUM_DESIGN.md, and the existing netlify/functions/health.ts, ChatColumn.tsx, and EidrixEye.tsx before planning.
```

---

## Step 2 — Ask for the Thorough Plan

Big chapter, lots of moving parts, worth the thorough treatment.

```
AC-01 replaces the canned chat responses with real streaming Claude via Anthropic's Messages API. Server lives in a Netlify Function (replacing the Chapter 13 health-check). Client streams tokens into the chat. Eye reactions fire for real events.

Thorough-plan this.

## Scope

**Server side (`netlify/functions/chat.ts`):**
- Takes a POST request with body `{ messages: [{role, content}, ...] }`
- Calls Anthropic Messages API with `stream: true`
- Uses model `claude-haiku-4-5-20251001` (cheapest, fastest — right for learning)
- Pipes the Anthropic SSE stream back to the browser as an SSE stream
- Reads ANTHROPIC_API_KEY from process.env (already configured from Chapter 13)
- Handles errors (invalid key, rate limit, timeout) with appropriate HTTP status codes
- System prompt lives in this file as a string constant for now

**Client side (ChatColumn and related):**
- When user hits Send, make a fetch() POST to `/.netlify/functions/chat` with the full message array including the new user message
- Read the response body as a stream using ReadableStream
- Parse SSE events as they arrive
- For each content delta, append characters to the in-progress assistant message
- When stream ends, finalize the message (mark complete, clear streaming state)
- If stream errors, mark the assistant message as errored and fire Eye Uncertainty

**Eye wiring:**
- Acknowledge on send (same as Chapter 11)
- Processing fires when fetch starts, stays active until stream ends
- Completion fires when stream ends successfully
- Uncertainty fires on stream error

**Deletes:**
- Chapter 11's canned response array
- Chapter 11's randomized thinking-duration logic
- Any other canned-response scaffolding

## What you propose

**Streaming architecture.** Propose how the Netlify Function streams Anthropic's response back to the browser. Anthropic's SDK returns an async iterable of events; the browser expects an SSE response stream. The bridge between these is the core of this chapter. Walk me through it.

**Client streaming consumer.** How does React state update as tokens arrive without causing perf issues? Batching? Direct state mutations with forceUpdate? Ref-based streaming buffer flushed to state? Propose and defend.

**Message type updates.** The Chapter 11 Message type needs fields for streaming state — something like `status: 'streaming' | 'complete' | 'error'`. Propose the final shape. Back-compatible with Chapter 11 ideally.

**System prompt.** Propose the actual system prompt text. It should establish Claude as "Eidrix" — a business operations assistant for small business owners. Warm but dry. Never "I'd be happy to help!" cheerfulness. References that the user is a business owner working with operational data. Keep it short — 3-5 sentences.

**Error shapes.** What errors are we handling and how do they render?
- Network failure (fetch rejects) — show "Connection lost. Check your network and try again." with a retry button on the message
- API key invalid (401 from our function) — this shouldn't happen in normal use, but show "Something's wrong with the AI connection. Check the logs." — developer-facing since it's a config bug
- Rate limit (429 from our function) — show "Too many requests. Please wait a moment." with automatic retry after 10s
- Anthropic returned an error mid-stream — mark the partial message as incomplete, show "Response interrupted. You can ask Claude to continue."
- Stream timed out (no tokens received for N seconds) — mark as incomplete, same handling

## Architecture questions

1. **SDK or fetch?** Anthropic has an official `@anthropic-ai/sdk` package that handles streaming cleanly. We could also use raw fetch() to call the Anthropic REST API. Propose which and why. SDK is probably simpler; verify it works in Netlify Functions environment.

2. **Where does the stream parsing logic live?** In ChatColumn? A custom hook? A separate lib file? I'd lean toward a custom hook like `useStreamingChat` but propose what feels right.

3. **Message ID generation.** Each message needs a stable ID. Propose how — `crypto.randomUUID()` (browser native, supported in Node 19+) or a small library like nanoid?

4. **Stopping mid-stream.** Can the user click a Stop button mid-response? Propose yes or no for this chapter — I lean "not this chapter, add in AC-05 when we handle multi-turn loops" but confirm.

5. **System prompt location.** Lives in `netlify/functions/chat.ts` as a hardcoded string for AC-01. User-configurable system prompts come later (eventually in Settings, per-tenant). Just confirm the plan respects this.

## Edge cases

At least 7:
- User sends a second message while first is still streaming
- Network drops mid-stream
- Anthropic returns a partial response then errors (we have some tokens but no completion)
- User navigates away from chat tab during streaming (e.g., clicks Brand tab — does stream continue or abort?)
- Stream receives an empty response (no tokens at all)
- Stream is extremely long (approaches max_tokens)
- Two rapid sends that both try to fetch simultaneously
- API key env var is missing in production (should never happen post-Chapter-13, but graceful failure)
- Reduced-motion user — should streaming still visibly "type" or appear all at once?

## What I'm NOT asking you to build

- Tool calling (AC-03)
- Multi-turn agentic loops (AC-05)
- Persistent conversation memory across sessions (AC-04)
- Data context injection (AC-02)
- Stop button
- Model selection UI
- User-configurable system prompt
- Multiple conversations

Plan, don't build. Wait for approval.
```

---

## Step 3 — Review the plan carefully

This plan will be long. Critical things to verify:

**The SDK vs raw fetch decision.** If Claude Code proposes raw fetch, ask "is there a reason not to use the official SDK?" The SDK handles edge cases (retry, parsing, typed responses) you'd have to write yourself. Unless there's a Netlify-specific limitation, SDK is almost always the right call.

**The streaming architecture explanation.** Claude Code should explain exactly how Anthropic's stream becomes your browser's stream. If the explanation is vague ("we pipe it through"), push for specifics: what format goes from Anthropic to the function? What format goes from the function to the browser? What transformation happens?

**The state update batching approach.** React re-renders on every state update. If streaming updates state 50 times per second as tokens arrive, you'd have 50 re-renders per second. That's bad. The plan should address this — probably with a ref-based buffer that flushes to state at a reasonable interval (say, 60fps via requestAnimationFrame).

**The system prompt text.** Ask to see the actual text. It's the voice of Eidrix. If it sounds generic or cheerful-AI, push for rewrites. This is the first thing Claude-as-Eidrix says to you. Worth getting right.

**The error handling is comprehensive.** All four+ error categories should have explicit UI states. If any is vague ("handle errors"), push for specifics.

**Reduced-motion handling.** If not mentioned, push: "How should streaming look for users with `prefers-reduced-motion`? Full response appears at once? Streaming still shows but without the cursor animation?"

When solid:

```
Plan approved. Start with the Netlify Function — update chat.ts to stream from Anthropic. Leave the client side alone for now. Stop after the function is built and I can test it with curl.
```

---

## Step 4 — Review and test the function

When Claude Code shows you the updated `netlify/functions/chat.ts`:

- System prompt text is what you expected
- Model is `claude-haiku-4-5-20251001`
- Streaming flag is enabled in the Anthropic call
- API key is read from env, never logged
- Response is piped back as SSE

Run it locally:

```
Run netlify dev, then help me test the chat function with curl. I want to send a fake message array and see tokens stream back in real time.
```

Claude Code should give you a curl command like:

```bash
curl -N -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Say hello in three words."}]}'
```

The `-N` flag is critical — it disables curl's output buffering so you see the stream live.

Expected: you should see SSE events streaming in your terminal character by character (not all at once). Each event looks something like:

```
data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}

data: {"type":"content_block_delta","delta":{"type":"text_delta","text":" there"}}

data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"!"}}
```

If you see events streaming: server side works. Real AI is answering your curl.

If you see the whole response arrive at once: streaming isn't working on the server. Common cause: SDK's stream parameter not set, or response buffering somewhere in Netlify Dev.

If you see an error: read it, tell Claude Code, debug.

**Don't move to client side until curl shows streaming events.** Server-side streaming works or the rest is pointless.

---

## Step 5 — Build the client streaming consumer

```
Function works — curl shows streaming tokens. Now build the client-side streaming consumer. Whatever shape you proposed in the plan — custom hook, inline logic, whatever. Wire it into ChatColumn so hitting Send calls the chat function and streams tokens into the in-progress assistant message.

Keep the Chapter 11 canned response code in place for now — don't delete it yet, just wire the real streaming as an alternative path. I want to verify real streaming works end-to-end before tearing out the fallback.
```

When it's done, open Trial and Error in your browser. Type a message, hit Send.

**You should see:**
- Your message appears instantly (Acknowledge fires)
- Eye goes to Processing
- An empty assistant message appears in the chat
- Tokens arrive and the message fills in character by character (or word by word, depending on how chunked they come)
- Stream ends, Eye fires Completion
- You can type another message and have a coherent conversation

**If the tokens appear instantly (all at once):**
Client-side streaming isn't reading the stream correctly. Tell Claude Code: *"The response arrives all at once, not streaming. Debug the client-side stream reader — tokens should render as they arrive."*

**If tokens arrive but the UI is laggy/stuttering:**
State update batching is probably wrong. Tell Claude Code: *"Streaming works but the UI stutters or feels slow. Review the state update pattern — likely too many re-renders per second."*

**If an error shows:**
Read the error, check the browser console, check the function logs (run `netlify dev` in a terminal tab, watch for function errors), tell Claude Code.

When streaming works end-to-end:

```
Real streaming works. Now delete all the Chapter 11 canned response code — the response array, the rotation logic, the randomized thinking duration. Clean removal, no dead code.
```

---

## Step 6 — Wire the real Eye reactions

```
Streaming works, canned responses gone. Now wire the Eye reactions for real events:

- Acknowledge: fires on user Send (already correct from Chapter 11)
- Processing: fires when fetch starts, should remain active until stream completes or errors
- Completion: fires when stream ends successfully (not on a timer like before — actually triggered by the stream's completion event)
- Uncertainty: fires when stream errors

Verify each reaction fires at the right real moment, not on a timer.
```

Test each path:
- Normal message — Acknowledge → Processing → Completion. Feel check: does the Eye feel present during streaming?
- Rapid-fire messages — does the reaction state stay coherent or get confused?
- Intentional error (disconnect wifi mid-stream) — does Uncertainty fire cleanly?

If anything feels off, iterate with specifics:

```
Processing ends too early — it's firing Completion when the first token arrives, not when the full stream ends. Fix so Processing stays until the message_stop event.
```

---

## Step 7 — Build the error UI

```
Now the error states. For each error scenario from the plan:

- Network failure: assistant message shows "Connection lost. [Retry]" — retry button re-sends the same message array
- Rate limit (429): assistant message shows "Too many requests. Retrying in 10s..." with auto-retry
- Server error (500): assistant message shows "Something went wrong. [Retry]"
- Streaming interruption: partial message shows with "Response was interrupted. [Continue]" — Continue button sends a new message asking Claude to continue

Design these to match the chat's aesthetic — warm obsidian, quiet, helpful. Not alarming. Error messages are UI moments, not failures.
```

Test each by simulating failures:
- Disable wifi → send message → verify network error shows
- Abort the function mid-stream by killing netlify dev → send message → verify interruption handling
- (Rate limit is hard to trigger locally — trust the code review for that one)

---

## Step 8 — Iterate on feel

Streaming feel is nuanced. Things to tune:

- **Perceived speed.** Haiku responds fast — sometimes too fast to feel like streaming. If responses complete in under a second, the streaming effect is lost. Not much you can do here (we're not artificially slowing it), but notice and accept.
- **Cursor indicator.** As tokens stream in, is there a blinking cursor or similar at the end of the in-progress message? If not, the stream looks static between token batches. A simple CSS blink on a pseudo-element at the message end solves this.
- **Auto-scroll during streaming.** The Slack rule from Chapter 11 still applies — only auto-scroll if user is near bottom. But during streaming, "near bottom" might need slight adjustment since the message itself is growing. Verify the scroll behavior feels right.
- **Eye Processing duration.** Does Processing feel active during streaming, or does the Eye look idle while responses arrive? If active — perfect. If idle — wire more tightly to streaming state.
- **System prompt voice.** Chat with it for 10 minutes. Does Claude-as-Eidrix feel like Eidrix? If responses sound generic, iterate the system prompt. This is the voice of your product.

---

## Step 9 — Code-simplifier review

```
AC-01 is live. Have code-simplifier review the new chat function, the streaming hook, and ChatColumn changes. Report suggestions but don't auto-apply.
```

Watch for:
- Suggestions to extract error handling into a generic utility (fine if obvious, skip if speculative)
- Suggestions to consolidate the streaming hook with Chapter 11's chat state (the streaming hook is specifically for AC-01; keep it separate)
- Suggestions that would make the system prompt harder to modify (it should remain easily-editable — AC-02 may touch it)

---

## Step 10 — Ship

```
Ready to ship. Commit, check off AC-01 in PROGRESS.md in the same commit, push, open PR.
```

Review the diff. Expected files:
- `netlify/functions/chat.ts` — major rewrite (from health to real chat)
- `netlify/functions/health.ts` — either deleted or kept as a diagnostic endpoint
- `src/lib/useStreamingChat.ts` (or similar name) — new streaming hook
- `src/components/ChatColumn.tsx` — modified to use real streaming
- `src/types/message.ts` (or wherever Message type lives) — updated for streaming status
- Deleted: whatever file held the Chapter 11 canned responses
- `package.json` — new dependency on `@anthropic-ai/sdk` if using SDK
- `curriculum/PROGRESS.md` — AC-01 checked off

Test the Deploy Preview URL carefully. Make sure production env var is picking up correctly and streaming works in production, not just locally. If the Deploy Preview streams — you're good.

---

## What just happened

Trial and Error is an AI app now. Real AI. Real streaming. Real Eidrix voice (well, draft-one voice — AC-02 will make it smarter).

More importantly: you just learned **streaming mechanics**, which is one of the legitimately hard concepts in modern web development. Most tutorials skip it entirely. Most apps get it wrong. You built a streaming server, a streaming client, and wired them to a real third-party API with full error handling.

Every AI chapter from here forward builds on this. AC-02 adds context. AC-03 adds tools. AC-04 adds memory. AC-05 adds loops. AC-16 adds subagents. Every one of them uses the streaming foundation you just shipped.

And the pattern you just learned — "client calls serverless function, function calls third-party API with secret, response streams back" — is the fundamental shape of every modern AI app. You now know it for real, in your hands, working code.

---

## What success looks like

- Typing a message in chat gets a real AI response
- Tokens stream into the response character-by-character, not all at once
- Conversation history persists within the session (refresh clears it, AC-04's job later)
- System prompt establishes Claude as Eidrix with appropriate voice
- Eye fires Acknowledge on send, Processing during streaming, Completion on stream end
- Eye fires Uncertainty on errors
- Network errors show a retry UI
- Rate limits auto-retry with visible status
- Stream interruptions show a continue UI
- All Chapter 11 canned response code is deleted, no dead code
- Works locally via `netlify dev` and in Deploy Previews
- PR merged, branch cleaned up, PROGRESS.md updated

---

## If something broke

- **"Function times out"** — Anthropic's API took too long OR the streaming response isn't being piped correctly. Tell Claude Code: *"Function times out on real messages. Check if the SSE stream is being piped correctly from Anthropic SDK to the response."*
- **"Tokens arrive all at once, not streaming"** — streaming not working on client OR server. First verify with curl (Step 4) whether server streams. If server streams but client doesn't, client reader is wrong. If server doesn't stream, SDK stream flag or response piping is wrong.
- **"Stream starts but stops mid-response"** — likely a Netlify Function timeout. Default is 10 seconds on Hobby plan. Tell Claude Code: *"Streams cut off around 10 seconds. Is this a Netlify Function timeout? How do I handle longer responses?"*
- **"401 Unauthorized from function"** — API key not reaching production. Check Netlify dashboard env vars are set correctly (including all deploy contexts).
- **"Response is cut off early"** — `max_tokens` is too low in the function. Default is probably 1024; bump to 2048 or 4096 for more room.
- **"System prompt doesn't seem to affect responses"** — system prompt isn't being passed correctly. Check the function sends it in the `system` parameter of the Anthropic request, not as a message in the messages array.
- **"Eye Processing never ends"** — lifecycle of the Processing reaction isn't clearing on stream end. Tell Claude Code: *"Eye stays in Processing forever after stream completes. Debug the streaming hook's cleanup — Processing should clear when the stream's done event fires."*

---

## Tour Moment — The full AI request lifecycle

What just happened when you hit Send:

1. React captures your input, adds it to the messages array
2. React calls `fetch('/.netlify/functions/chat', { method: 'POST', body: JSON.stringify({ messages }) })`
3. The browser hits Netlify's edge
4. Netlify routes to your Function
5. Your Function reads `process.env.ANTHROPIC_API_KEY` (server-side, invisible to browser)
6. Your Function calls Anthropic's Messages API with `stream: true`
7. Anthropic streams SSE events back to your Function
8. Your Function pipes those events to the browser as its own SSE response
9. Your browser reads the stream chunk by chunk
10. Each chunk is parsed, the content delta is appended to the in-progress message
11. React re-renders (with batching so it's not insane)
12. Stream ends, message is marked complete
13. Eye fires Completion

Twelve steps. Three machines involved (your browser, Netlify's server, Anthropic's server). One API key that never leaves the middle machine. One streaming pipe that lets the AI "type" into your browser.

This is the shape of every modern AI app. Cursor works this way. Claude.ai works this way. v0 works this way. Perplexity works this way. Your Trial and Error now works this way too.

Keep this mental model. When something breaks in future AI chapters, the debugging approach is always "which step failed?" — trace from browser → function → Anthropic, find the break, fix it.

---

## Tour Moment — Why streaming matters more than you'd think

Latency is measured in two ways for AI apps:

**Total response time** — how long from Send to final token.
**Time to first token (TTFT)** — how long from Send to the *first* character appearing.

Without streaming, the user experiences *total response time* — they see nothing until the full response is ready. A 3-second generation feels like a 3-second wait.

With streaming, the user experiences *time to first token* — they see something appearing within 200-500ms typically, even if the full response takes 3 seconds. A 3-second generation feels like an immediate start, with Claude "typing" for 3 seconds.

This isn't a trick. It's a real perception shift. Research on UI responsiveness (Jakob Nielsen's classic 0.1s / 1s / 10s thresholds) shows users tolerate long operations when they see progress. Streaming converts "wait 3 seconds" into "see progress for 3 seconds."

When you eventually ship real Eidrix to customers, this perception difference between streaming and non-streaming AI will be worth dozens of paying customers. People feel the difference even when they can't articulate it.

---

## Tour Moment — System prompts as product voice

The system prompt you shipped is a few sentences. It's also the entire voice of Eidrix as a product.

Compare these two system prompts:

**Prompt A:** "You are a helpful AI assistant. Answer the user's questions."

**Prompt B:** "You are Eidrix, a business operations assistant embedded in a small business owner's workspace. You help them think through operational decisions with grounded, practical advice. You're dry, direct, and trustworthy — more like a skilled bookkeeper than a cheerful chatbot. You never make things up. When you don't know something, you say so."

The same Claude model behind both prompts produces radically different responses. Prompt A gets you a generic chatbot. Prompt B gets you *a specific product with a specific voice*.

This is why "prompt engineering" matters as a skill. Not as a magic spell, but as product design expressed in natural language. The system prompt is where you tell the AI *who to be*. That identity is your product.

In AC-02 or later, we'll move the system prompt out of the function and into a place where it can be customized per tenant — imagine a merch seller configures "You help a merch seller manage orders, inventory, and shipping" vs. a plumber configuring "You help a plumber dispatch, bill, and schedule." Same Claude, dramatically different products.

For now, the system prompt in `chat.ts` is your first draft of the Eidrix voice. Iterate on it as you use it. The right voice won't be obvious day one.

---

## Next up

**AC-02 — Context-Aware Chat.** The agent becomes aware of your actual data. The customer records from Chapter 10 get injected into the conversation context. Asking "who haven't I contacted in 30 days?" returns real answers based on your records. This is where Eidrix starts being useful, not just conversant.

After AC-02 the roadmap opens up fast:
- **AC-03 — Agentic Foundation.** Claude gets permission to actually CREATE, UPDATE, DELETE records via natural language. "Add a customer named John Smith at 555-1234" — and a new row appears in your Records tab. The agentic moment.
- **AC-04 — Agent Memory.** Conversations persist across sessions. Eidrix remembers what you talked about yesterday.
- **AC-05 — Multi-Turn Loops.** The agent can take multiple steps for one request. "Plan my Thursday" triggers a sequence: check schedule, check pending jobs, draft priorities, ask for confirmation.
- **AC-16 — Agentic Subagents.** One Eidrix spawns specialized subagents for complex tasks. Still a ways off, but the foundation is what you just shipped.

You're three chapters away from real tool-calling agentic Eidrix. That's close. Ship this well.

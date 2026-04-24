// ──────────────────────────────────────────────────────────────────────
// AgentDebugTab — observability for AI requests (AC-02 Phase D + E).
//
// Shows the last 10 chat requests with everything Claude saw and what
// came back. Top of the tab: cumulative session cost (Phase E). Each
// entry is collapsed by default; expand to see the full system prompt,
// messages array, response, and token usage.
//
// Hidden in production via VITE_DEV_MODE. Mounted as a primary tab in
// contractor.tsx only when import.meta.env.VITE_DEV_MODE === 'true'.
//
// "Why did Eidrix say X?" → open the entry, read the system prompt
// the function actually sent, see whether the data was missing,
// the prompt was wrong, or the model just blew it.
// ──────────────────────────────────────────────────────────────────────

import { useState } from 'react'

import {
  useDebugStore,
  type DebugEntry,
  type RetrievedMemoryEntry,
  type ToolCallEntry,
} from '../../lib/debugStore'
import { MODEL_META, type ContextMode } from '../../types/agentSettings'
import type { PlanStep, PlanStepStatus } from '../../types/activePlan'

/** Pill colors for the context-mode badge. Off is muted, subset is
 *  cool/cobalt (the production default), full is hot/ember (heavier
 *  data injection — visually flags the cost premium). */
function contextBadgeClasses(mode: ContextMode): string {
  switch (mode) {
    case 'off':
      return 'bg-obsidian-700 text-text-tertiary'
    case 'subset':
      return 'bg-cobalt-500/15 text-cobalt-500'
    case 'full':
      return 'bg-ember-700/30 text-ember-300'
  }
}

function formatUsd(n: number): string {
  if (n < 0.0001) return '$0.0000'
  return `$${n.toFixed(4)}`
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export default function AgentDebugTab() {
  const entries = useDebugStore((s) => s.entries)
  const cumulativeCostUsd = useDebugStore((s) => s.cumulativeCostUsd)
  const clear = useDebugStore((s) => s.clear)

  return (
    <div className="h-full overflow-auto eidrix-scrollbar">
      <div className="p-8 max-w-[900px]">
        {/* Header */}
        <header className="mb-8">
          <h1 className="font-display text-2xl text-text-primary tracking-tight">
            Agent Debug
          </h1>
          <p className="font-body text-sm text-text-secondary mt-1">
            Per-request observability — system prompt, context, tokens,
            response time, cost. Last {entries.length === 1 ? '1 request' : `${entries.length} requests`} this session.
          </p>
        </header>

        {/* Cumulative cost (Phase E) */}
        <section className="mb-8 bg-obsidian-900 border border-obsidian-800 rounded-lg p-6 flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-tertiary mb-1">
              Session cost
            </p>
            <p className="font-display text-3xl text-ember-300 tabular-nums">
              {formatUsd(cumulativeCostUsd)}
            </p>
            <p className="font-body text-xs text-text-tertiary mt-1">
              Across {entries.length} request{entries.length === 1 ? '' : 's'}.
              Resets on page refresh or "Clear history" below.
            </p>
          </div>
          <button
            type="button"
            onClick={clear}
            disabled={entries.length === 0}
            className="font-mono text-[11px] uppercase tracking-wider text-text-tertiary hover:text-danger-500 disabled:opacity-40 disabled:hover:text-text-tertiary transition-colors"
          >
            Clear history
          </button>
        </section>

        {/* Entries */}
        {entries.length === 0 ? (
          <div className="border border-dashed border-obsidian-800 rounded-md p-12 text-center">
            <p className="font-body text-sm text-text-secondary">
              No requests yet this session.
            </p>
            <p className="font-body text-xs text-text-tertiary mt-1">
              Send Eidrix a message to populate this view.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <DebugEntryRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Entry row (collapsed/expanded) ─────────────────────────────────

function DebugEntryRow({ entry }: { entry: DebugEntry }) {
  const [open, setOpen] = useState(false)
  const meta = MODEL_META[entry.model]
  const totalTokens = entry.inputTokens + entry.outputTokens

  return (
    <div
      className={`border rounded-md transition-colors ${
        entry.errorMessage
          ? 'bg-danger-500/5 border-danger-500/40'
          : 'bg-obsidian-900 border-obsidian-800'
      }`}
    >
      {/* Collapsed summary — always visible */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left grid grid-cols-[80px_1fr_auto_auto_auto_24px] items-center gap-4 px-4 py-3 hover:bg-obsidian-800/40 transition-colors"
      >
        <span className="font-mono text-[10px] text-text-tertiary tabular-nums">
          {formatTime(entry.timestamp)}
        </span>
        <span className="font-body text-sm text-text-primary truncate">
          {entry.errorMessage ? (
            <span className="text-danger-500">⚠ {entry.errorMessage} — </span>
          ) : null}
          {entry.userMessagePreview}
        </span>
        <span
          className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${contextBadgeClasses(entry.contextMode)}`}
        >
          {entry.contextMode}
        </span>
        <span className="font-mono text-[10px] text-text-secondary">
          {meta?.label ?? entry.model}
        </span>
        <span className="font-mono text-[10px] text-text-tertiary tabular-nums">
          {totalTokens.toLocaleString()} tok · {formatMs(entry.responseTimeMs)} · {formatUsd(entry.costUsd)}
        </span>
        <span className="font-mono text-text-tertiary text-sm leading-none">
          {open ? '▾' : '▸'}
        </span>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-obsidian-800 p-5 space-y-5">
          {/* Usage stats grid */}
          <DetailSection title="Usage stats">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 font-mono text-xs">
              <Stat label="Input tokens" value={entry.inputTokens.toLocaleString()} />
              <Stat label="Output tokens" value={entry.outputTokens.toLocaleString()} />
              <Stat label="Cache read" value={entry.cacheReadInputTokens.toLocaleString()} />
              <Stat label="Cache create" value={entry.cacheCreationInputTokens.toLocaleString()} />
              <Stat label="System prompt" value={`${entry.systemPromptBytes.toLocaleString()} bytes`} />
              <Stat label="Response time" value={formatMs(entry.responseTimeMs)} />
              <Stat
                label="Customers in ctx"
                value={`${entry.customerCount} / ${entry.totalCustomers}`}
              />
              <Stat
                label="Jobs in ctx"
                value={`${entry.jobCount} / ${entry.totalJobs}`}
              />
              <Stat label="Cost" value={formatUsd(entry.costUsd)} highlight />
              <Stat label="Model" value={meta?.label ?? entry.model} />
            </div>
            {entry.contextWarning && (
              <p className="mt-3 font-mono text-xs text-ember-300">
                ⚠ {entry.contextWarning}
              </p>
            )}
          </DetailSection>

          {/* System prompt */}
          <DetailSection title="System prompt sent">
            <pre className="bg-obsidian-950 border border-obsidian-800 rounded-md p-4 font-mono text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap break-words max-h-[400px] overflow-auto eidrix-scrollbar">
              {entry.systemPromptSent || '(empty)'}
            </pre>
          </DetailSection>

          {/* UI context (AC-03 S2) — what the agent saw about where the
              user was looking when the question was asked. Absent on
              older entries from before S2; rendered only when present. */}
          {entry.uiContext && (
            <DetailSection title="UI context">
              <div className="grid grid-cols-[120px_1fr] gap-y-1.5 font-mono text-xs">
                <span className="text-text-tertiary">Primary tab</span>
                <span className="text-text-secondary">
                  {entry.uiContext.primaryTab.label}
                </span>
                {entry.uiContext.activeRecord && (
                  <>
                    <span className="text-text-tertiary">Active record</span>
                    <span className="text-text-secondary">
                      {entry.uiContext.activeRecord.displayName}{' '}
                      <span className="text-text-tertiary">
                        ({entry.uiContext.activeRecord.kind} ·{' '}
                        {entry.uiContext.activeRecord.id})
                      </span>
                    </span>
                  </>
                )}
                {entry.uiContext.activeSection && (
                  <>
                    <span className="text-text-tertiary">Active section</span>
                    <span className="text-text-secondary">
                      {entry.uiContext.activeSection.label}
                    </span>
                  </>
                )}
              </div>
            </DetailSection>
          )}

          {/* Plan trace (AC-05) — nested view of the agentic plan for
              this turn. Renders steps with their final status + tool
              calls grouped by iteration. Only shown when the turn ran
              a plan; simple single-tool turns fall through to the
              flat Tool trace section below. */}
          {entry.activePlanId && entry.activePlanSteps.length > 0 && (
            <DetailSection
              title={`Plan trace — ${entry.activePlanSteps.length} step${entry.activePlanSteps.length === 1 ? '' : 's'} · ${entry.toolCalls.length} tool call${entry.toolCalls.length === 1 ? '' : 's'} across ${entry.iterations} iteration${entry.iterations === 1 ? '' : 's'}`}
            >
              <PlanTrace
                steps={entry.activePlanSteps}
                toolCalls={entry.toolCalls}
              />
            </DetailSection>
          )}

          {/* Tool trace (AC-03 S2) — the full loop of tool calls made
              during this request, with timings and results. Rendered
              for non-plan turns OR as the flat fallback even when a
              plan ran (raw data is still useful). */}
          {entry.toolCalls.length > 0 && (
            <DetailSection
              title={`Tool trace (${entry.toolCalls.length} call${entry.toolCalls.length === 1 ? '' : 's'} · ${entry.iterations} iteration${entry.iterations === 1 ? '' : 's'}${entry.affectedEntities.length > 0 ? ` · affected: ${entry.affectedEntities.join(', ')}` : ' · read-only'})`}
            >
              <div className="space-y-2">
                {entry.toolCalls.map((call, i) => (
                  <ToolCallRow key={i} call={call} />
                ))}
                {entry.hitIterationCap && (
                  <p className="font-mono text-[11px] text-ember-300 mt-3">
                    ⚠ Hit iteration cap — loop stopped before the agent
                    signaled completion.
                  </p>
                )}
              </div>
            </DetailSection>
          )}

          {/* Retrieved memories (AC-04 Session 2) — facts the hybrid
              retrieval layer pulled in for this turn. Empty array for
              fresh users, short messages, or no-match queries. */}
          {entry.retrievedMemories.length > 0 && (
            <DetailSection
              title={`Retrieved memories (${entry.retrievedMemories.length})`}
            >
              <MemoryTrace
                memories={entry.retrievedMemories}
                responseText={entry.responseText}
              />
            </DetailSection>
          )}

          {/* Messages array */}
          <DetailSection title={`Messages array (${entry.messagesSent.length})`}>
            <div className="space-y-2">
              {entry.messagesSent.map((m, i) => (
                <div
                  key={i}
                  className="bg-obsidian-950 border border-obsidian-800 rounded-md p-3"
                >
                  <p className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary mb-1">
                    {m.role}
                  </p>
                  <p className="font-mono text-[12px] text-text-primary whitespace-pre-wrap break-words leading-relaxed">
                    {m.content}
                  </p>
                </div>
              ))}
            </div>
          </DetailSection>

          {/* Response */}
          <DetailSection title="Response">
            <div className="bg-obsidian-950 border border-obsidian-800 rounded-md p-4">
              {entry.errorMessage ? (
                <p className="font-mono text-[12px] text-danger-500">
                  ⚠ {entry.errorMessage}
                </p>
              ) : null}
              {entry.responseText ? (
                <p className="font-mono text-[12px] text-text-primary whitespace-pre-wrap break-words leading-relaxed">
                  {entry.responseText}
                </p>
              ) : (
                !entry.errorMessage && (
                  <p className="font-mono text-xs text-text-tertiary">(empty)</p>
                )
              )}
            </div>
          </DetailSection>
        </div>
      )}
    </div>
  )
}

// ─── Small primitives ───────────────────────────────────────────────

function DetailSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-tertiary mb-2">
        {title}
      </h3>
      {children}
    </div>
  )
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between border-b border-obsidian-800/50 pb-1">
      <span className="text-text-tertiary">{label}</span>
      <span
        className={`tabular-nums ${highlight ? 'text-ember-300' : 'text-text-secondary'}`}
      >
        {value}
      </span>
    </div>
  )
}

// ─── Tool trace row ──────────────────────────────────────────────────
// One call in the agent's tool loop. Collapsed by default; click to
// expand the full input + result JSON. Iteration badge doubles as the
// visual hierarchy so multi-iteration loops read as a grouped timeline.

function truncate(s: string, max = 140): string {
  if (s.length <= max) return s
  return s.slice(0, max) + '…'
}

/** Text color for a tool-call row's result tag. Three states: failed
 *  (danger), succeeded-but-a-preview/awaiting-confirmation (dimmed
 *  ember), succeeded-and-committed (success green). */
function toolCallResultClass(
  succeeded: boolean,
  isPreview: boolean,
): string {
  if (!succeeded) return 'text-danger-500'
  if (isPreview) return 'text-ember-300/80'
  return 'text-success-500'
}

function ToolCallRow({ call }: { call: ToolCallEntry }) {
  const [open, setOpen] = useState(false)
  const result = call.result as
    | { success?: boolean; error?: string; code?: string; data?: unknown }
    | null
  const succeeded = result?.success === true
  const isPreview =
    succeeded &&
    typeof result?.data === 'object' &&
    result?.data !== null &&
    (result.data as { requires_confirmation?: unknown })
      .requires_confirmation === true

  // Summary line — tool name + compact arg preview.
  const argSummary = (() => {
    try {
      const json = JSON.stringify(call.input)
      return json === '{}' ? '()' : `(${truncate(json.slice(1, -1))})`
    } catch {
      return '(unserializable)'
    }
  })()

  // Short result tag.
  const resultTag = !succeeded
    ? `✗ ${result?.error ?? 'failed'}`
    : isPreview
      ? 'preview (awaiting confirmation)'
      : '✓'

  return (
    <div className="bg-obsidian-950 border border-obsidian-800 rounded-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left grid grid-cols-[52px_1fr_auto_20px] items-start gap-3 px-3 py-2 hover:bg-obsidian-800/40 transition-colors"
      >
        <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-wider mt-0.5">
          iter {call.iteration}
        </span>
        <span className="min-w-0">
          <span
            className={`font-mono text-[12px] ${
              call.name === 'emitPlanStep'
                ? 'text-cobalt-500'
                : 'text-ember-300'
            }`}
            title={
              call.name === 'emitPlanStep'
                ? 'Plan-signaling tool — no data mutation, drives the plan card UI'
                : undefined
            }
          >
            {call.name === 'emitPlanStep' ? '◈ ' : ''}
            {call.name}
          </span>
          <span className="font-mono text-[11px] text-text-tertiary">
            {argSummary}
          </span>
          <span
            className={`ml-2 font-mono text-[11px] ${toolCallResultClass(succeeded, isPreview)}`}
          >
            {resultTag}
          </span>
        </span>
        <span className="font-mono text-[10px] text-text-tertiary tabular-nums">
          {call.durationMs}ms
        </span>
        <span className="font-mono text-text-tertiary text-sm leading-none">
          {open ? '▾' : '▸'}
        </span>
      </button>

      {open && (
        <div className="border-t border-obsidian-800 px-3 py-3 space-y-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-tertiary mb-1">
              Input
            </p>
            <pre className="font-mono text-[11px] text-text-secondary whitespace-pre-wrap break-words bg-obsidian-900/60 rounded-sm p-2 max-h-[240px] overflow-auto eidrix-scrollbar">
              {JSON.stringify(call.input, null, 2)}
            </pre>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-tertiary mb-1">
              Result
            </p>
            <pre className="font-mono text-[11px] text-text-secondary whitespace-pre-wrap break-words bg-obsidian-900/60 rounded-sm p-2 max-h-[240px] overflow-auto eidrix-scrollbar">
              {JSON.stringify(call.result, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Memory trace (AC-04 Session 2) ──────────────────────────────────
// Renders retrieved facts as a ranked table with similarity color
// coding. Heuristic: if a consecutive ≥4-word phrase from the fact
// content appears in the response text, mark the fact as "used" so
// the user can see which memories Claude actually paraphrased.

function similarityBadge(sim: number): { color: string; label: string } {
  if (sim >= 0.7) return { color: 'text-success-500', label: 'high' }
  if (sim >= 0.5) return { color: 'text-ember-300', label: 'med' }
  if (sim >= 0.3) return { color: 'text-ember-700', label: 'low' }
  return { color: 'text-text-tertiary', label: 'weak' }
}

/** Strip punctuation and collapse whitespace so "before 10am." tokenizes
 *  identically to "before 10am," and "10am" — otherwise trailing dots
 *  and commas would cause false negatives on obvious paraphrases. */
function tokenizeForMatch(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
}

function factWasReferenced(fact: string, response: string): boolean {
  if (!response) return false
  const factTokens = tokenizeForMatch(fact)
  if (factTokens.length < 4) return false
  const responseTokens = new Set<string>()
  const rt = tokenizeForMatch(response)
  // Build a set of 4-grams from the response for O(1) window check.
  for (let i = 0; i <= rt.length - 4; i++) {
    responseTokens.add(rt.slice(i, i + 4).join(' '))
  }
  // Any fact 4-gram present in the response → paraphrase-level reuse.
  for (let i = 0; i <= factTokens.length - 4; i++) {
    const window = factTokens.slice(i, i + 4).join(' ')
    if (responseTokens.has(window)) return true
  }
  return false
}

function MemoryTrace({
  memories,
  responseText,
}: {
  memories: RetrievedMemoryEntry[]
  responseText: string
}) {
  return (
    <div className="space-y-1">
      {memories.map((m) => {
        const { color, label } = similarityBadge(m.similarity)
        const referenced = factWasReferenced(m.content, responseText)
        return (
          <div
            key={m.factId}
            className={`grid grid-cols-[60px_52px_1fr_auto] items-start gap-3 rounded-sm border px-3 py-2 ${
              referenced
                ? 'border-success-500/30 bg-success-500/5'
                : 'border-obsidian-800 bg-obsidian-950'
            }`}
          >
            <span className={`font-mono text-[11px] tabular-nums ${color}`}>
              {m.similarity.toFixed(2)}
            </span>
            <span className={`font-mono text-[10px] uppercase ${color}`}>
              {label}
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[12px] text-text-primary whitespace-normal break-words">
                {m.content}
              </p>
              <p className="font-mono text-[10px] text-text-tertiary mt-0.5">
                {m.factType}
                {m.entityType && m.entityId
                  ? ` · ${m.entityType} ${m.entityId.slice(0, 8)}…`
                  : ''}
                {' · confidence '}
                {m.confidence.toFixed(2)}
              </p>
            </div>
            {referenced && (
              <span className="font-mono text-[10px] uppercase tracking-wider text-success-500">
                used
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Plan trace (AC-05) ──────────────────────────────────────────────
// Nested view of an agentic plan: step list with final statuses, plus
// the actual tool calls grouped by iteration. "Grouped by iteration"
// not "grouped by step" because we don't have a server-side tool→step
// linkage — the agent could fire N tools in one iteration spanning
// M steps. Iteration-grouping is the honest presentation.
//
// emitPlanStep calls are filtered out of the tool group view (they're
// already represented by the step list up top); only "real work" tools
// surface as per-iteration items.

function planStepStatusStyle(status: PlanStepStatus): {
  glyph: string
  className: string
} {
  switch (status) {
    case 'complete':
      return { glyph: '✓', className: 'text-ember-500' }
    case 'active':
      return { glyph: '◉', className: 'text-ember-500' }
    case 'failed':
      return { glyph: '✗', className: 'text-danger-500' }
    case 'pending':
      return { glyph: '○', className: 'text-text-tertiary' }
  }
}

/** Title text color for a plan step in the historical trace. */
function planTraceStepTitleClass(status: PlanStepStatus): string {
  switch (status) {
    case 'complete':
      return 'text-text-tertiary'
    case 'failed':
      return 'text-danger-500/90'
    case 'active':
    case 'pending':
      return 'text-text-primary'
  }
}

function PlanTrace({
  steps,
  toolCalls,
}: {
  steps: PlanStep[]
  toolCalls: ToolCallEntry[]
}) {
  // Group non-signaling tool calls by iteration for the "what the
  // agent actually did per turn" view. emitPlanStep fires communicate
  // plan structure and show up in the step list; hiding them here
  // keeps the per-iteration view focused on real work.
  const byIteration = new Map<number, ToolCallEntry[]>()
  for (const call of toolCalls) {
    if (call.name === 'emitPlanStep') continue
    const list = byIteration.get(call.iteration) ?? []
    list.push(call)
    byIteration.set(call.iteration, list)
  }
  const iterations = [...byIteration.keys()].sort((a, b) => a - b)

  return (
    <div className="space-y-4">
      {/* Step list — the plan's structure with final statuses. */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-tertiary mb-2">
          Steps
        </p>
        <ol className="space-y-1.5">
          {steps.map((step, i) => {
            const { glyph, className } = planStepStatusStyle(step.status)
            return (
              <li
                key={step.id}
                className="flex items-start gap-2.5 font-mono text-[12px]"
              >
                <span className="text-text-tertiary/60 tabular-nums w-5 text-right flex-shrink-0">
                  {i + 1}.
                </span>
                <span className={`${className} flex-shrink-0 w-3 text-center`}>
                  {glyph}
                </span>
                <span className={planTraceStepTitleClass(step.status)}>
                  {step.title}
                </span>
              </li>
            )
          })}
        </ol>
      </div>

      {/* Tools per iteration — the actual work. */}
      {iterations.length > 0 && (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-tertiary mb-2">
            Tool calls by iteration
          </p>
          <div className="space-y-3">
            {iterations.map((iter) => {
              const calls = byIteration.get(iter) ?? []
              const totalMs = calls.reduce((s, c) => s + c.durationMs, 0)
              return (
                <div key={iter} className="space-y-1.5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ember-500/80">
                    Iter {iter} · {calls.length} call
                    {calls.length === 1 ? '' : 's'} · {formatMs(totalMs)}
                  </p>
                  <div className="space-y-1.5 pl-3 border-l border-ember-700/25">
                    {calls.map((call, i) => (
                      <PlanTraceToolLine key={i} call={call} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// Compact single-line tool render inside PlanTrace — the verbose
// input/result expansion stays in the flat Tool trace below.
function PlanTraceToolLine({ call }: { call: ToolCallEntry }) {
  const result = call.result as
    | { success?: boolean; error?: string }
    | null
  const succeeded = result?.success === true
  return (
    <div className="flex items-start gap-2 font-mono text-[11px] leading-snug">
      <span
        aria-hidden
        className={`flex-shrink-0 w-3 text-center ${succeeded ? 'text-ember-500/75' : 'text-danger-500/75'}`}
      >
        {succeeded ? '✓' : '✗'}
      </span>
      <span className="flex-1 text-text-secondary truncate">
        <span className="text-text-primary">{call.name}</span>
        {!succeeded && result?.error && (
          <span className="text-danger-500/80"> — {result.error}</span>
        )}
      </span>
      <span className="flex-shrink-0 text-text-tertiary/70 tabular-nums">
        {formatMs(call.durationMs)}
      </span>
    </div>
  )
}

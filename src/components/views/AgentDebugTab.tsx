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

import { useDebugStore, type DebugEntry, type ToolCallEntry } from '../../lib/debugStore'
import { MODEL_META, type ContextMode } from '../../types/agentSettings'

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

          {/* Tool trace (AC-03 S2) — the full loop of tool calls made
              during this request, with timings and results. Only
              rendered when tool calls happened. */}
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
          <span className="font-mono text-[12px] text-ember-300">
            {call.name}
          </span>
          <span className="font-mono text-[11px] text-text-tertiary">
            {argSummary}
          </span>
          <span
            className={`ml-2 font-mono text-[11px] ${
              succeeded
                ? isPreview
                  ? 'text-ember-300/80'
                  : 'text-success-500'
                : 'text-danger-500'
            }`}
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

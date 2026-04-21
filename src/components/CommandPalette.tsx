import { Command } from 'cmdk'
import { useMemo, useState } from 'react'
import type { TabId } from './TabsPanel'
import { createCommands } from '../lib/commands'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  setActiveTab: (id: TabId) => void
}

// Shared class string for each command row. Centralised so the Navigation
// and Actions groups render identically.
const itemClass =
  'flex items-center justify-between gap-4 px-3 py-2 rounded-md cursor-pointer text-text-primary font-body text-sm transition-colors data-[selected=true]:bg-ember-700/20 data-[selected=true]:text-ember-300'

// Tailwind's [&_selector] syntax lets us style cmdk's internal group-heading
// element without having to pass it a ref. cmdk annotates its heading with
// [cmdk-group-heading] so we target that.
const groupClass =
  '[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-text-tertiary'

export default function CommandPalette({
  open,
  onOpenChange,
  setActiveTab,
}: CommandPaletteProps) {
  const [search, setSearch] = useState('')

  const commands = useMemo(
    () =>
      createCommands({
        setActiveTab,
        setSearch,
        closePalette: () => onOpenChange(false),
      }),
    [setActiveTab, onOpenChange]
  )

  const navCommands = commands.filter((c) => c.category === 'Navigation')
  const actionCommands = commands.filter((c) => c.category === 'Actions')

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Command Palette"
      // `className` is forwarded to Radix's Dialog.Content — the floating
      // palette box itself. Top-anchored (15vh from top) so it doesn't feel
      // trapped in the dead center of the screen.
      className="fixed top-[15vh] left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-xl bg-obsidian-900 border border-obsidian-700 rounded-lg overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.5),_0_0_48px_rgba(255,107,26,0.08)]"
      // `overlayClassName` styles the Radix Dialog.Overlay — the backdrop
      // that covers everything behind the palette.
      overlayClassName="fixed inset-0 z-40 bg-obsidian-950/70 backdrop-blur-sm"
    >
      {/* Search input. cmdk auto-focuses this on open. */}
      <div className="border-b border-obsidian-800 px-4 py-3">
        <Command.Input
          value={search}
          onValueChange={setSearch}
          placeholder="Type a command or search…"
          className="w-full bg-transparent text-text-primary placeholder-text-tertiary font-body text-sm focus:outline-none"
        />
      </div>

      {/* Command list. Scrolls when taller than max-height. */}
      <Command.List className="max-h-[400px] overflow-y-auto p-2">
        <Command.Empty className="py-8 text-center font-mono text-xs uppercase tracking-wider text-text-tertiary">
          No commands match
        </Command.Empty>

        {navCommands.length > 0 && (
          <Command.Group heading="Navigation" className={groupClass}>
            {navCommands.map((cmd) => (
              <Command.Item
                key={cmd.id}
                value={`${cmd.name} ${cmd.description}`}
                onSelect={cmd.execute}
                className={itemClass}
              >
                <span>{cmd.name}</span>
                <span className="text-xs text-text-tertiary">
                  {cmd.description}
                </span>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {actionCommands.length > 0 && (
          <Command.Group heading="Actions" className={groupClass}>
            {actionCommands.map((cmd) => (
              <Command.Item
                key={cmd.id}
                value={`${cmd.name} ${cmd.description}`}
                onSelect={cmd.execute}
                className={itemClass}
              >
                <span>{cmd.name}</span>
                <span className="text-xs text-text-tertiary">
                  {cmd.description}
                </span>
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  )
}

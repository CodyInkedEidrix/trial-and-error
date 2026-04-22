import type { ReactNode } from 'react'
import { activeConfig } from '../config/active'

export type CommandCategory = 'Navigation' | 'Actions'

export interface Command {
  id: string
  name: string
  description: string
  category: CommandCategory
  /** Reserved for a future chapter — left undefined in the initial roster. */
  icon?: ReactNode
  execute: () => void
}

interface CommandDeps {
  setActiveTab: (id: string) => void
  setSearch: (value: string) => void
  closePalette: () => void
}

/**
 * Build the command roster. The factory pattern keeps commands.ts a
 * pure data file (no hooks, no React imports beyond the type) while
 * still letting each command's execute function reach into stateful
 * things like the active tab and the palette's internal search.
 *
 * Post-Ch-10.5: Navigation commands derive from `activeConfig.primaryTabs`
 * rather than a hardcoded list, so swapping business type swaps the
 * palette's nav commands automatically.
 */
export function createCommands(deps: CommandDeps): Command[] {
  const navCommands: Command[] = activeConfig.primaryTabs.map((tab) => ({
    id: `nav-${tab.id}`,
    name: `Jump to ${tab.label}`,
    description: `Switch to the ${tab.label} tab`,
    category: 'Navigation',
    execute: () => {
      deps.setActiveTab(tab.id)
      deps.closePalette()
    },
  }))

  const actionCommands: Command[] = [
    {
      id: 'act-clear-search',
      name: 'Clear search',
      description: 'Empty the palette search input',
      category: 'Actions',
      execute: () => deps.setSearch(''),
    },
    {
      id: 'act-close',
      name: 'Close palette',
      description: 'Dismiss the command palette',
      category: 'Actions',
      execute: () => deps.closePalette(),
    },
  ]

  return [...navCommands, ...actionCommands]
}

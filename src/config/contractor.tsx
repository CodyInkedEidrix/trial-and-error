// ──────────────────────────────────────────────────────────────────────
// contractorConfig — the current Trial and Error shape.
//
// This is what the app IS today. Reading this file top-to-bottom should
// tell you the entire product: what tabs exist, what records live on
// them, what sections show up inside a record, how data comes in, how
// it goes out. Code stays generic; this config describes the product.
// ──────────────────────────────────────────────────────────────────────

import type { BusinessConfig, RecordsConfig } from './businessConfig'
import { recordsTab } from './businessConfig'
import type { Customer } from '../types/customer'
import type { Job } from '../types/job'
import { useCustomerStore } from '../lib/customerStore'
import { useCustomerFormStore } from '../lib/customerFormStore'
import { useJobStore } from '../lib/jobStore'
import { useJobFormStore } from '../lib/jobFormStore'
import { useToastStore } from '../lib/toastStore'
import { useTabStore } from '../lib/tabStore'
import { formatRelative } from '../lib/relativeTime'

import LabView from '../components/views/LabView'
import ChatView from '../components/views/ChatView'
import SettingsView from '../components/views/SettingsView'
import ComponentsTab from '../components/ComponentsTab'
import BrandTab from '../components/BrandTab'
import StatusBadge from '../components/records/StatusBadge'
import JobStatusBadge from '../components/records/JobStatusBadge'
import CustomerProfileStrip from '../components/records/CustomerProfileStrip'
import JobProfileStrip from '../components/records/JobProfileStrip'
import CustomerOverviewSection from '../components/records/sections/CustomerOverviewSection'
import CustomerNotesSection from '../components/records/sections/CustomerNotesSection'
import CustomerJobsSection from '../components/records/sections/CustomerJobsSection'
import JobOverviewSection from '../components/records/sections/JobOverviewSection'
import JobRelatedCustomerSection from '../components/records/sections/JobRelatedCustomerSection'

const UNDO_WINDOW_MS = 5000

// ─── Customer records configuration ───────────────────────────────────

const customerRecords: RecordsConfig<Customer> = {
  recordType: 'customer',
  singular: 'Customer',
  plural: 'Customers',

  // Hook-style getter — the engine calls this inside its render tree,
  // so Zustand's selector subscription works exactly as it does when
  // components call it directly.
  useRecords: () => useCustomerStore((s) => s.customers),

  getId: (c) => c.id,
  getDisplayName: (c) => c.name,

  columns: [
    {
      id: 'name',
      header: 'Customer',
      widthClass: 'w-[30%]',
      render: (c) => (
        <div>
          <div className="font-body text-sm text-text-primary transition-colors group-hover:text-ember-300 group-focus-visible:text-ember-300">
            {c.name}
          </div>
          {c.company && (
            <div className="font-body text-xs text-text-tertiary mt-0.5">
              {c.company}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      widthClass: 'w-[14%]',
      render: (c) => <StatusBadge status={c.status} />,
    },
    {
      id: 'contact',
      header: 'Contact',
      widthClass: 'w-[26%]',
      render: (c) => (
        <div>
          {c.phone && (
            <div className="font-mono text-xs text-text-secondary tabular-nums">
              {c.phone}
            </div>
          )}
          {c.email && (
            <div className="font-mono text-[11px] text-text-tertiary mt-0.5 truncate max-w-[220px]">
              {c.email}
            </div>
          )}
          {!c.phone && !c.email && (
            <span className="font-mono text-xs text-text-tertiary">—</span>
          )}
        </div>
      ),
    },
    {
      id: 'activity',
      header: 'Last activity',
      widthClass: 'w-[20%]',
      render: (c) => (
        <span className="font-body text-xs text-text-tertiary">
          {formatRelative(c.lastActivityAt)}
        </span>
      ),
    },
  ],

  detailSections: [
    {
      id: 'overview',
      label: 'Overview',
      Component: CustomerOverviewSection,
    },
    {
      id: 'jobs',
      label: 'Jobs',
      Component: CustomerJobsSection,
    },
    {
      id: 'notes',
      label: 'Notes',
      Component: CustomerNotesSection,
    },
  ],

  ProfileStrip: CustomerProfileStrip,

  // Opening the add-customer flow still goes through the slide-in form
  // panel from Ch 10. The engine's only responsibility is to dispatch
  // the "Add {singular}" button click to whatever the config hands it.
  onAddRecord: () => useCustomerFormStore.getState().openAdd(),

  // Delete + toast + undo — the same flow that lived inline in
  // RecordsTab.tsx, relocated to config so the engine's row delete
  // affordance can call it uniformly.
  onDeleteRecord: (c) => {
    const store = useCustomerStore.getState()
    const toast = useToastStore.getState()
    store.deleteCustomer(c.id)
    toast.push({
      title: `${c.name} deleted`,
      variant: 'info',
      duration: UNDO_WINDOW_MS,
      action: {
        label: 'Undo',
        onClick: () => store.undoDelete(c.id),
      },
      onDismiss: () => store.finalizeDelete(c.id),
    })
  },

  // Phase C: row click opens the record as a third-tier tab. The
  // slide-in form is still reachable via "Add customer"; it's now
  // add-only, not edit. Editing happens inline in the Overview section
  // via auto-save-on-blur.
  onRowClick: (c) => useTabStore.getState().openRecordTab('records', c),

  // Row flash on newly-added records — reads the UI signal we added in
  // Step 9 of the Ch 10 build. Config owns the subscription; engine
  // calls the hook generically.
  useRecentlyAddedId: () => useCustomerStore((s) => s.recentlyAddedId),
}

// ─── Job records configuration (AC-02) ────────────────────────────────
// Mirrors customerRecords. The engine renders this exactly the same way
// — that's the proof that Chapter 10.5's engine generalized correctly.

function formatAmountUsd(amount: number | undefined): string {
  if (amount === undefined || amount === null) return '—'
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function formatScheduledDate(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

const jobRecords: RecordsConfig<Job> = {
  recordType: 'job',
  singular: 'Job',
  plural: 'Jobs',

  useRecords: () => useJobStore((s) => s.jobs),

  getId: (j) => j.id,
  getDisplayName: (j) => j.title,

  columns: [
    {
      id: 'title',
      header: 'Job',
      widthClass: 'w-[36%]',
      render: (j) => (
        <div className="font-body text-sm text-text-primary transition-colors group-hover:text-ember-300 group-focus-visible:text-ember-300">
          {j.title}
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      widthClass: 'w-[16%]',
      render: (j) => <JobStatusBadge status={j.status} />,
    },
    {
      id: 'customer',
      header: 'Customer',
      widthClass: 'w-[24%]',
      render: (j) => <JobCustomerCell job={j} />,
    },
    {
      id: 'scheduled',
      header: 'Scheduled',
      widthClass: 'w-[12%]',
      render: (j) => (
        <span className="font-mono text-xs text-text-secondary tabular-nums">
          {formatScheduledDate(j.scheduledDate)}
        </span>
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      widthClass: 'w-[12%]',
      render: (j) => (
        <span className="font-mono text-xs text-ember-300 tabular-nums">
          {formatAmountUsd(j.amount)}
        </span>
      ),
    },
  ],

  detailSections: [
    {
      id: 'overview',
      label: 'Overview',
      Component: JobOverviewSection,
    },
    {
      id: 'customer',
      label: 'Related Customer',
      Component: JobRelatedCustomerSection,
    },
  ],

  ProfileStrip: JobProfileStrip,

  onAddRecord: () => useJobFormStore.getState().openAdd(),

  onDeleteRecord: (j) => {
    const store = useJobStore.getState()
    const toast = useToastStore.getState()
    store.deleteJob(j.id)
    toast.push({
      title: `${j.title} deleted`,
      variant: 'info',
      duration: UNDO_WINDOW_MS,
      action: {
        label: 'Undo',
        onClick: () => store.undoDelete(j.id),
      },
      onDismiss: () => store.finalizeDelete(j.id),
    })
  },

  onRowClick: (j) => useTabStore.getState().openRecordTab('jobs', j),

  useRecentlyAddedId: () => useJobStore((s) => s.recentlyAddedId),
}

// Sub-component used in the job-row "Customer" cell. Lives at module
// scope (not inline in the column render) so React doesn't recreate it
// every paint. Looks up the customer name from the store; falls back
// to a placeholder if the related customer isn't loaded.
function JobCustomerCell({ job }: { job: Job }) {
  const customerName = useCustomerStore(
    (s) => s.customers.find((c) => c.id === job.customerId)?.name,
  )
  return (
    <span className="font-body text-xs text-text-secondary">
      {customerName ?? '—'}
    </span>
  )
}

// ─── The contractor config ────────────────────────────────────────────

export const contractorConfig: BusinessConfig = {
  id: 'contractor',
  name: 'Contractor Workspace',
  primaryTabs: [
    { id: 'lab', label: 'Lab', kind: 'custom', Component: LabView },
    {
      id: 'components',
      label: 'Components',
      kind: 'custom',
      Component: ComponentsTab,
    },
    { id: 'brand', label: 'Brand', kind: 'custom', Component: BrandTab },
    recordsTab<Customer>({
      id: 'records',
      label: 'Records',
      kind: 'records',
      records: customerRecords,
    }),
    recordsTab<Job>({
      id: 'jobs',
      label: 'Jobs',
      kind: 'records',
      records: jobRecords,
    }),
    { id: 'chat', label: 'Chat', kind: 'custom', Component: ChatView },
    { id: 'settings', label: 'Settings', kind: 'custom', Component: SettingsView },
  ],
}

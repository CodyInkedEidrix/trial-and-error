// ──────────────────────────────────────────────────────────────────────
// merchConfig — the "prove the engine adapts" config.
//
// This configures Trial and Error as a merch-seller workspace. No
// engine or primitive code changes — this is a pure data swap. Products
// replace Customers; Orders replaces Chat's place in the nav order;
// Variants and Inventory replace Overview/Notes as detail sections.
//
// Data is a hardcoded sample array scoped to this file. Proving the
// engine adapts does not require a real product store — that's scope
// for a hypothetical dedicated merch chapter.
// ──────────────────────────────────────────────────────────────────────

import type { BusinessConfig, RecordsConfig } from './businessConfig'
import { recordsTab } from './businessConfig'
import type { Product } from '../types/product'
import { useTabStore } from '../lib/tabStore'

import LabView from '../components/views/LabView'
import ChatView from '../components/views/ChatView'
import SettingsView from '../components/views/SettingsView'
import OrdersView from '../components/views/OrdersView'
import ComponentsTab from '../components/ComponentsTab'
import BrandTab from '../components/BrandTab'

import ProductOverviewSection from '../components/records/sections/ProductOverviewSection'
import ProductVariantsSection from '../components/records/sections/ProductVariantsSection'
import ProductInventorySection from '../components/records/sections/ProductInventorySection'
import ProductProfileStrip from '../components/records/ProductProfileStrip'

// ─── Sample product data ──────────────────────────────────────────────

const MERCH_SAMPLE: Product[] = [
  {
    id: 'prod-01',
    name: 'Oxide Hoodie',
    sku: 'OXD-HDY-001',
    priceCents: 6500,
    stockCount: 23,
    description: 'Heavyweight fleece pullover with embroidered ember mark.',
  },
  {
    id: 'prod-02',
    name: 'Oxide Cap',
    sku: 'OXD-CAP-001',
    priceCents: 3000,
    stockCount: 48,
    description: 'Six-panel structured cap, slate crown, ember eyelets.',
  },
  {
    id: 'prod-03',
    name: 'Logo Tee',
    sku: 'OXD-TEE-001',
    priceCents: 2800,
    stockCount: 112,
    description: 'Ringspun cotton, true-to-size fit, soft hand feel.',
  },
  {
    id: 'prod-04',
    name: 'Enamel Pin Set',
    sku: 'OXD-PIN-001',
    priceCents: 1800,
    stockCount: 67,
    description: 'Five-piece pin collection, hard enamel, backing card.',
  },
  {
    id: 'prod-05',
    name: 'Tote Bag',
    sku: 'OXD-TOT-001',
    priceCents: 2200,
    stockCount: 0,
    description: 'Heavy canvas tote, reinforced straps. Currently out of stock.',
  },
  {
    id: 'prod-06',
    name: 'Sticker Pack',
    sku: 'OXD-STK-001',
    priceCents: 800,
    stockCount: 201,
    description: 'Twelve die-cut stickers, weatherproof vinyl.',
  },
]

// ─── Product records configuration ────────────────────────────────────

const productRecords: RecordsConfig<Product> = {
  recordType: 'product',
  singular: 'Product',
  plural: 'Products',

  // Hardcoded array for this chapter — real merch support would read
  // from a productStore paralleling customerStore.
  useRecords: () => MERCH_SAMPLE,

  getId: (p) => p.id,
  getDisplayName: (p) => p.name,

  columns: [
    {
      id: 'name',
      header: 'Product',
      widthClass: 'w-[35%]',
      render: (p) => (
        <div className="font-body text-sm text-text-primary transition-colors group-hover:text-ember-300 group-focus-visible:text-ember-300">
          {p.name}
        </div>
      ),
    },
    {
      id: 'sku',
      header: 'SKU',
      widthClass: 'w-[22%]',
      render: (p) => (
        <span className="font-mono text-xs text-text-secondary">{p.sku}</span>
      ),
    },
    {
      id: 'price',
      header: 'Price',
      widthClass: 'w-[15%]',
      render: (p) => (
        <span className="font-body text-sm text-text-primary tabular-nums">
          ${(p.priceCents / 100).toFixed(2)}
        </span>
      ),
    },
    {
      id: 'stock',
      header: 'In stock',
      widthClass: 'w-[18%]',
      render: (p) => (
        <span
          className={`font-mono text-xs tabular-nums ${
            p.stockCount === 0 ? 'text-danger-500' : 'text-text-secondary'
          }`}
        >
          {p.stockCount === 0 ? 'Out of stock' : p.stockCount}
        </span>
      ),
    },
  ],

  detailSections: [
    {
      id: 'overview',
      label: 'Overview',
      Component: ProductOverviewSection,
    },
    {
      id: 'variants',
      label: 'Variants',
      Component: ProductVariantsSection,
    },
    {
      id: 'inventory',
      label: 'Inventory',
      Component: ProductInventorySection,
    },
  ],

  ProfileStrip: ProductProfileStrip,

  // No add/delete for the stub merch config — products are read-only
  // in this chapter. The engine respects the absence of these handlers
  // by hiding the corresponding affordances.

  // Phase C: row click opens the product as a third-tier tab with
  // Overview / Variants / Inventory sections.
  onRowClick: (p) => useTabStore.getState().openRecordTab('products', p),
}

// ─── The merch config ─────────────────────────────────────────────────

export const merchConfig: BusinessConfig = {
  id: 'merch',
  name: 'Merch Seller Workspace',
  primaryTabs: [
    { id: 'lab', label: 'Lab', kind: 'custom', Component: LabView },
    {
      id: 'components',
      label: 'Components',
      kind: 'custom',
      Component: ComponentsTab,
    },
    { id: 'brand', label: 'Brand', kind: 'custom', Component: BrandTab },
    recordsTab<Product>({
      id: 'products',
      label: 'Products',
      kind: 'records',
      records: productRecords,
    }),
    { id: 'orders', label: 'Orders', kind: 'custom', Component: OrdersView },
    { id: 'chat', label: 'Chat', kind: 'custom', Component: ChatView },
    { id: 'settings', label: 'Settings', kind: 'custom', Component: SettingsView },
  ],
}

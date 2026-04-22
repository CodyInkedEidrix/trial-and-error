// ──────────────────────────────────────────────────────────────────────
// ProductProfileStrip — slim header above a product's active section.
//
// Surfaces SKU, price, and stock inline. Mirror of CustomerProfileStrip
// for the merch config — proves the engine is agnostic to record type
// while each config owns its own profile presentation.
// ──────────────────────────────────────────────────────────────────────

import type { Product } from '../../types/product'

interface ProductProfileStripProps {
  record: Product
}

export default function ProductProfileStrip({
  record,
}: ProductProfileStripProps) {
  const price = (record.priceCents / 100).toFixed(2)
  const outOfStock = record.stockCount === 0

  return (
    <div className="px-6 py-4 border-b border-obsidian-800 bg-obsidian-900/30">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-xl text-text-primary">
          {record.name}
        </h1>
        <span className="font-mono text-xs text-text-secondary">
          {record.sku}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 font-body text-xs text-text-tertiary">
        <span className="text-text-secondary">${price}</span>
        <span
          className={`font-mono tabular-nums ${
            outOfStock ? 'text-danger-500' : ''
          }`}
        >
          {outOfStock ? 'Out of stock' : `${record.stockCount} in stock`}
        </span>
      </div>
    </div>
  )
}

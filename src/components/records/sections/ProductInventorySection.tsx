// ──────────────────────────────────────────────────────────────────────
// ProductInventorySection — stub for the merch config.
//
// Shows the current stock count pulled from the product record. Real
// inventory management would bring in stock history, reorder points,
// per-location inventory, etc.
// ──────────────────────────────────────────────────────────────────────

import type { Product } from '../../../types/product'

interface ProductInventorySectionProps {
  record: Product
}

export default function ProductInventorySection({
  record,
}: ProductInventorySectionProps) {
  return (
    <div className="p-6 space-y-4 max-w-2xl">
      <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
        Inventory for {record.name}
      </p>
      <div className="flex items-baseline gap-3">
        <span className="font-display text-4xl text-text-primary tabular-nums">
          {record.stockCount}
        </span>
        <span className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
          units in stock
        </span>
      </div>
      <p className="font-body text-sm text-text-tertiary">
        Reorder points, per-location stock, and inventory history would ship
        in a dedicated merch chapter.
      </p>
    </div>
  )
}

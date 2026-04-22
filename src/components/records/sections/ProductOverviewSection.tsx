// ──────────────────────────────────────────────────────────────────────
// ProductOverviewSection — the 'Overview' secondary tab inside the
// product record detail view (merch config only).
//
// Intentional stub — merch exists to prove the engine adapts, not to
// ship a full merch app. Real product editing would live behind a
// proper form and store in a later chapter.
// ──────────────────────────────────────────────────────────────────────

import type { Product } from '../../../types/product'

interface ProductOverviewSectionProps {
  record: Product
}

export default function ProductOverviewSection({
  record,
}: ProductOverviewSectionProps) {
  const price = (record.priceCents / 100).toFixed(2)

  return (
    <div className="p-6 space-y-4 max-w-2xl">
      <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
        Overview for {record.name}
      </p>
      <dl className="grid grid-cols-[120px_1fr] gap-y-2 font-body text-sm">
        <dt className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
          SKU
        </dt>
        <dd className="font-mono text-text-primary">{record.sku}</dd>

        <dt className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
          Price
        </dt>
        <dd className="text-text-primary">${price}</dd>

        <dt className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
          In stock
        </dt>
        <dd className="text-text-primary tabular-nums">{record.stockCount}</dd>

        {record.description && (
          <>
            <dt className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
              Description
            </dt>
            <dd className="text-text-primary">{record.description}</dd>
          </>
        )}
      </dl>
    </div>
  )
}

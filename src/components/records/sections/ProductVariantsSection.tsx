// ──────────────────────────────────────────────────────────────────────
// ProductVariantsSection — stub for the merch config.
//
// Deliberately minimal. Real variants would need size/color/material
// dimensions, per-variant pricing and stock, etc. — a chapter of
// its own if merch ever becomes a real Eidrix customer type.
// ──────────────────────────────────────────────────────────────────────

import type { Product } from '../../../types/product'

interface ProductVariantsSectionProps {
  record: Product
}

export default function ProductVariantsSection({
  record,
}: ProductVariantsSectionProps) {
  return (
    <div className="p-6 space-y-2 max-w-2xl">
      <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
        Variants for {record.name}
      </p>
      <p className="font-body text-sm text-text-tertiary">
        Variant configuration isn't part of this chapter — merch exists to
        prove the engine adapts to different business shapes. Real variant
        editing would ship in a dedicated merch chapter.
      </p>
    </div>
  )
}

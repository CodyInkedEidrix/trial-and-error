// ──────────────────────────────────────────────────────────────────────
// Product — the shape of a single product record in the merch config.
//
// Scoped to this chapter's "prove the engine is adaptable" demo. Real
// Eidrix merch support would expand this significantly (variants,
// option types, multi-currency pricing, inventory locations, etc.).
// For now: the minimum shape needed to render a believable product
// row + detail sections, paired with a few hardcoded sample records
// inside the merch config.
// ──────────────────────────────────────────────────────────────────────

export interface Product {
  id: string
  /** Storefront-facing product name. */
  name: string
  /** Stock-keeping unit — the internal identifier. */
  sku: string
  /** Price in cents to avoid float math. $29 = 2900. */
  priceCents: number
  /** Current stock count across all variants. Denormalized. */
  stockCount: number
  /** Short product description; optional for V1. */
  description?: string
}

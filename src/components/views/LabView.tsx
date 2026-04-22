// ──────────────────────────────────────────────────────────────────────
// LabView — the 'Lab' primary tab content. Composites Typography, Color,
// and Motion labs into a single scrollable stream. Extracted from
// TabsPanel's old inline 'lab' branch so the engine can mount it as
// one Component per the BusinessConfig contract.
// ──────────────────────────────────────────────────────────────────────

import TypographyLab from '../TypographyLab'
import ColorLab from '../ColorLab'
import MotionLab from '../MotionLab'

export default function LabView() {
  return (
    <>
      <TypographyLab />
      <ColorLab />
      <MotionLab />
    </>
  )
}

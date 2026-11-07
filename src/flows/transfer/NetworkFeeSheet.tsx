import { Button, Divider, Radio, Sheet } from '@monarch/design-system'
import { Fragment } from 'react'
import { FEE_TIERS, type FeeTier } from '../../data/cryptoNetworks'
import { cryptoFee } from '../../data/derive'
import { formatMyr } from '../../data/format'
import type { CryptoHolding } from '../../data/types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE NETWORK FEE SHEET — Gate 98 (Flow 5), Figma `1266:14399`.
 *
 * Two DS `Radio layout="row"` rows (v2.13.0, G66 / R97-2) — "Regular / 60+ Min
 * / RM 4.60" — in a `radiogroup` named by the sheet's title, a `Divider`
 * between them, then OK and Cancel, as drawn. Regular is pre-selected (R96-7).
 *
 * THE CHOICE IS PENDING UNTIL OK (R96-7). The screen owns `tier`; OK commits
 * it, and Cancel, ✕ and the scrim discard it — the drawn footer, not S1's
 * "a tap commits", because this is a sheet over a screen, not a dropdown in an
 * overlay (Gate 96 Phase A F11).
 *
 * THE TITLE IS CENTRED (R97-7): the DS's `OverlayHeader`, a recorded divergence
 * from the frame's older left-aligned header.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function NetworkFeeSheet(props: {
  isOpen: boolean
  holding: CryptoHolding
  tier: FeeTier
  onTierChange: (tier: FeeTier) => void
  onOk: () => void
  onCancel: () => void
}) {
  const { isOpen, holding, tier, onTierChange, onOk, onCancel } = props
  return (
    <Sheet
      isOpen={isOpen}
      onClose={onCancel}
      title="Network Fee"
      actions={
        <>
          <Button variant="primary" size="l" label="OK" onClick={onOk} />
          <Button variant="secondary" size="l" label="Cancel" onClick={onCancel} />
        </>
      }
    >
      <div role="radiogroup" aria-label="Network Fee" className="mvp-fee__options">
        {FEE_TIERS.map((t, i) => {
          const fee = cryptoFee(holding.id, t)
          return (
            <Fragment key={t}>
              {i > 0 && <Divider />}
              <Radio
                layout="row"
                id={`fee-${t}`}
                name="network-fee"
                value={t}
                label={fee.label}
                description={fee.wait}
                trailingLabel={formatMyr(fee.fee)}
                isChecked={tier === t}
                onChange={(checked) => {
                  if (checked) onTierChange(t)
                }}
              />
            </Fragment>
          )
        })}
      </div>
    </Sheet>
  )
}

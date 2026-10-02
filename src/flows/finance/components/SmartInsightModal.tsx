import { Button, CardDataDisplay, Icon, Modal } from '@monarch/design-system'

import { offerImageUrl } from '../../../config/media'
import {
  commitmentProviderName,
  offerMonthlySaving,
  offerYearlySaving,
} from '../../../data/derive'
import { formatMyr } from '../../../data/format'
import type { Commitment, CommitmentOffer } from '../../../data/types'

/**
 * -----------------------------------------------------------------------------
 * FLOW 11 - THE SMART INSIGHT, Figma `1266:14341` (Gate 80).
 *
 * A `Modal`, NOT A `Sheet`, AND THE LAYER NAME IS THE TRAP FOR THE FOURTH TIME.
 * The frame names the inner node "Bottom Sheet", and its GEOMETRY says Modal:
 * x=16 and 343 wide inside a 375 frame, so it is inset on BOTH sides, with all
 * four corners rounded and no home-indicator region. A DS `Sheet` is full-bleed
 * with a top-only radius. Flow 9 hit this same name three times (Gate 50's bulk
 * modal, Gate 51's receipt viewer, Gate 51-B's); geometry wins, every time.
 *
 * ------------------------------ THE FIGURES ---------------------------------
 *
 * EVERY NUMBER ON THIS PANEL IS DERIVED FROM TWO STORED PRICES - the
 * commitment's RM 120 and the offer's RM 70. The saving is RM 50/month and
 * RM 600/year, which is exactly what this frame prints.
 *
 * FIGMA ITSELF IS THE ARGUMENT FOR DERIVING THEM. The education frame
 * (`1266:14342`) draws its own underlying copy of this panel, and THAT copy
 * still reads "Save RM 51/month" while showing "RM 600/year" beside it - two
 * transcribed figures that disagree, since 51 x 12 is 612. Teku's ruling, 30
 * September: the 51 is an error and must not be reconciled back.
 *
 * MONEY CARRIES TWO DECIMALS where Figma writes "RM 50/month" and
 * "RM 600/year". The app's standing one-formatter divergence, already settled
 * against "RM 700" on the budget cards.
 *
 * ---------------------------- WHAT IS COMPOSED ------------------------------
 *
 * The two price tiles are the DS `CardDataDisplay` in its default VERTICAL
 * orientation at `sizing="fill"`; the Savings row is the SAME component in the
 * `'horizontal'` orientation v2.7.0 added for this exact node - its doc comment
 * names `casestudy_02 886:7320, 311x56`, which is the row Figma draws here as a
 * DETACHED copy of the card. So nothing here is hand-rolled.
 * -----------------------------------------------------------------------------
 */
export function SmartInsightModal({
  commitment,
  offer,
  onClose,
  onLearnMore,
  onComingSoon,
}: {
  commitment: Commitment
  offer: CommitmentOffer
  onClose: () => void
  onLearnMore: () => void
  onComingSoon: () => void
}) {
  const monthly = offerMonthlySaving(commitment, offer)
  const yearly = offerYearlySaving(commitment, offer)

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Smart insights"
      headerIconLeft={<Icon name="icon_aiinsights" size="m" />}
      className="mvp-insight-modal"
      footer={
        <>
          {/*
            BOTH RAISE A "Coming soon." TOAST ON THE SCREEN BENEATH, closing
            this modal first. `Modal` renders at z-index 100 and the app's toast
            is the fifth fixed element at tier 3, so a toast raised under an
            open modal would sit behind its blanket - see the screen's note.
          */}
          <Button variant="primary" size="l" label="View Promotion" onClick={onComingSoon} />
          <Button variant="secondary" size="l" label="Remind Me Later" onClick={onComingSoon} />
        </>
      }
    >
      <div className="mvp-insight">
        {/*
          THE PROMO ARTWORK. Figma clips a 312x175 image into a 311x128 window
          (`image 98` at y=-34), which is a crop expressed as an overflowing
          child; `object-fit: cover` on a ratio-locked box reproduces it without
          a negative offset that would break at a second viewport.

          ITS `alt` IS EMPTY ON PURPOSE. The heading and body directly beneath
          state the offer in full, so describing the marketing raster again
          would make a screen reader say it twice.
        */}
        <div className="mvp-insight__artwork">
          <img src={offerImageUrl(offer.image)} alt="" />
        </div>

        <div className="mvp-insight__headline">
          <p className="mvp-insight__title type-body-m-semibold">
            {`${offer.provider} Promotion Available`}
          </p>
          <p className="mvp-insight__subtitle type-body-caption">
            {`Save ${formatMyr(monthly)}/month on your ${commitment.name} bill`}
          </p>
        </div>

        <div className="mvp-insight__compare">
          <CardDataDisplay
            sizing="fill"
            info="Current"
            content={commitmentProviderName(commitment)}
            content2={formatMyr(commitment.amount)}
          />
          <CardDataDisplay
            sizing="fill"
            info="Suggested"
            content={offer.provider}
            content2={formatMyr(offer.amount)}
          />
        </div>

        {/*
          THE SAVINGS ROW IS THE SAME COMPONENT, HORIZONTAL. Figma draws it as a
          DETACHED copy of `card/data display` (311x56, label left, value
          right); v2.7.0 added `orientation="horizontal"` for it by name, so
          this is the DS component rather than a local lookalike.
        */}
        <CardDataDisplay
          sizing="fill"
          orientation="horizontal"
          info="Savings"
          content={`${formatMyr(yearly)}/year`}
        />

        {/*
          "How Monarch find savings" IS TRANSCRIBED AS DRAWN, missing "s" and
          all. Figma writes it this way on the link and "How Monarch finds ways
          to save on bills" on the education panel it opens; inventory A4/A7
          already record the file disagreeing with itself in one Section, and
          this app's standing treatment is to transcribe rather than silently
          correct Teku's copy.
        */}
        <button type="button" className="mvp-insight__learn" onClick={onLearnMore}>
          <span className="type-body-sm-semibold">How Monarch find savings</span>
          <Icon name="chevron_right" size="s" />
        </button>
      </div>
    </Modal>
  )
}

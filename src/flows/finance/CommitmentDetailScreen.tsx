import {
  Button,
  CardDataDisplay,
  HeaderDefault,
  InlineMessage,
  StatusBar,
  ToastMobile,
} from '@monarch/design-system'
import { useCallback, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'

import { useAccounts } from '../../accounts/AccountsProvider'
import { CommitmentMark } from '../../components/CommitmentMark'
import {
  commitmentCadenceLabel,
  commitmentDateLabel,
  commitmentOffer,
  commitmentPaymentLabel,
  commitmentProviderName,
  offerMonthlySaving,
} from '../../data/derive'
import { formatMyr } from '../../data/format'
import type { Commitment, CommitmentOffer } from '../../data/types'
import { InsightEducationModal } from './components/InsightEducationModal'
import { SmartInsightModal } from './components/SmartInsightModal'
import { FINANCE_TAB_STATE_KEY } from './financeTabs'
import './finance.css'

/**
 * -----------------------------------------------------------------------------
 * FLOW 11 - THE COMMITMENT DRILL-DOWN,
 * `/finance/plans/commitments/:commitmentId` (Gate 80).
 *
 * Figma `Finance_Plan_view commitment` (`1266:14343`), 375 x 812.
 *
 * THE ROUTE IS THE SIBLING `GoalDetailScreen` NAMED. That file records why the
 * path is not a flat `/finance/plans/<id>`: the Plans tab holds TWO kinds of
 * detail, and a flat path could not tell a goal id from a commitment id.
 * Everything else follows it exactly - a route param rather than a route-scoped
 * provider (B8), data from the app-level `useAccounts()`, chrome declared by
 * prefix in `chrome.ts`, and an unknown id redirecting to the Plans tab with
 * `replace` so Back cannot return to a dead URL.
 *
 * ------------------------- ONLY ONE ROW IS DRAWN ----------------------------
 *
 * FIGMA DRAWS THE INTERNET COMMITMENT AND NOTHING ELSE, so the other six
 * details are undesigned work, built under the 21 September ruling. The screen
 * is written so that every field Figma shows only for Internet is OPTIONAL and
 * its element is OMITTED rather than drawn empty - the plan name, the
 * contract-end card and the promotion banner all disappear on a row with none.
 * A dash would assert "this exists and was not read", which is the Gate 79 rule
 * and false here.
 *
 * THAT IS WHY ALL SEVEN ROWS ARE IN THE WALK rather than a hand-picked two. The
 * hero has two shapes (a brand logo, a tinted icon badge) and the body has two
 * (with and without an offer), so two states cannot see all four; and the
 * harness expands every other `:param` TOTALLY over its collection, where a
 * subset would be the hand-written list its own error message warns against.
 *
 * ------------------------ WHAT IS DRAWN BUT NOT WIRED -----------------------
 *
 * FOUR CONTROLS SHOW A "Coming soon." TOAST: "Edit Commitment", "Set Reminder",
 * and the insight's "View Promotion" and "Remind Me Later". The Flow 11 plan
 * names all four, and the MVP scope rule is the reason - each is drawn, none is
 * drawn as a FLOW anywhere in the twelve inventoried flows, and no other flow
 * reads what they would write.
 *
 * THE TWO INSIDE THE MODAL CLOSE IT FIRST, and that is a z-index fact rather
 * than a preference: `Modal` renders at `z-index: 100` and the app's toast is
 * the fifth fixed element at tier 3, so a toast raised under an open modal
 * would be invisible behind its blanket. Closing the insight and raising the
 * toast on the screen beneath is also what both controls would really do.
 * ---------------------------------------------------------------------------
 */
export function CommitmentDetailScreen() {
  const navigate = useNavigate()
  const { commitmentId } = useParams()
  const { commitments, commitmentOffers, fiatAccounts } = useAccounts()

  const commitment = commitments.find((c) => c.id === commitmentId)

  const backToPlansTab = useCallback(
    () => navigate('/finance', { state: { [FINANCE_TAB_STATE_KEY]: 'plans' } }),
    [navigate],
  )

  /*
    TWO BOOLEANS, NOT ONE ENUM, BECAUSE THE EDUCATION MODAL STACKS OVER THE
    INSIGHT RATHER THAN REPLACING IT. Figma `1266:14342` draws the insight panel
    still there behind a second blanket, so both are open at once - which is
    also what the walk state declares through the Gate 50-A `opens`/`dialogs`
    split. A single `view` enum would have expressed a swap, which is the
    filter sheet's shape and the wrong one here.
  */
  const [isInsightOpen, setIsInsightOpen] = useState(false)
  const [isEducationOpen, setIsEducationOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Stable `onClose`s - the G31 convention for anything reaching a DS overlay.
  const closeInsight = useCallback(() => {
    setIsEducationOpen(false)
    setIsInsightOpen(false)
  }, [])
  const closeEducation = useCallback(() => setIsEducationOpen(false), [])
  const openEducation = useCallback(() => setIsEducationOpen(true), [])
  const dismissToast = useCallback(() => setToast(null), [])
  const comingSoon = useCallback(() => {
    setIsEducationOpen(false)
    setIsInsightOpen(false)
    setToast(COMING_SOON)
  }, [])

  if (!commitment) {
    return <Navigate to="/finance" replace state={{ [FINANCE_TAB_STATE_KEY]: 'plans' }} />
  }

  const offer = commitmentOffer(commitmentOffers, commitment.id)
  const paymentLabel = commitmentPaymentLabel(fiatAccounts, commitment)

  return (
    <div className="mvp-commitment-detail">
      <StatusBar mode="Light" time="9:41" />
      {/* `hasSubtitle={false}` IS LOAD-BEARING: `HeaderDefault` defaults it to
          true with the literal "Subtitle" - the omitted-prop trap this repo has
          now hit six times. Figma draws no action on the right of this header,
          so `actionLabel` is omitted rather than blanked. */}
      <HeaderDefault title={commitment.name} hasSubtitle={false} onBack={backToPlansTab} />

      <div className="mvp-commitment-detail__body">
        {/*
          FIGMA CENTRES THIS HERO IN A 75px COLUMN (`Frame 294` at x=150), which
          is a hug around the widest child rather than a width to reproduce. A
          centred column of the full content width lands the same marks on the
          same axis and survives a longer provider name, which a 75px box would
          clip.
        */}
        <section className="mvp-commitment-detail__hero">
          <CommitmentMark commitment={commitment} size="hero" />
          <div className="mvp-commitment-detail__identity">
            <span className="mvp-commitment-detail__provider type-body-m-semibold">
              {commitmentProviderName(commitment)}
            </span>
            {/* OMITTED, NOT DASHED, on the six rows with no plan name. */}
            {commitment.planName ? (
              <span className="mvp-commitment-detail__plan type-body-sm">
                {commitment.planName}
              </span>
            ) : null}
          </div>
        </section>

        {/*
          FIGMA'S `Frame 287` IS A WRAPPING ROW of `card/data display` at 163.5
          wide with 16px gaps - not a two-column grid, and the metadata says so
          (`content-start flex flex-wrap`). `sizing="fill"` releases the DS's
          164px box and its 300px cap so each card takes its track; that is the
          prop v2.7.0 added for exactly these tiles, and its own doc comment
          names this flow's 147.5 / 163.5 / 311 widths.

          THE CARD COUNT IS 3 OR 4 AND THE ROW WRAPS EITHER WAY, because only
          Internet carries a contract end date.
        */}
        <section className="mvp-commitment-detail__facts mvp-column">
          <CardDataDisplay
            sizing="fill"
            info={commitmentCadenceLabel(commitment)}
            content={formatMyr(commitment.amount)}
          />
          <CardDataDisplay
            sizing="fill"
            info="Payment Date"
            content={commitmentDateLabel(commitment.nextDueOn)}
          />
          {paymentLabel ? (
            <CardDataDisplay sizing="fill" info="Payment Method" content={paymentLabel} />
          ) : null}
          {commitment.contractEndsOn ? (
            <CardDataDisplay
              sizing="fill"
              info="Contract End Date"
              content={commitmentDateLabel(commitment.contractEndsOn)}
            />
          ) : null}
        </section>

        {offer ? (
          <section className="mvp-commitment-detail__offer mvp-column">
            <OfferBanner
              commitment={commitment}
              offer={offer}
              onView={() => setIsInsightOpen(true)}
            />
          </section>
        ) : null}
      </div>

      {/*
        THE SAME STICKY BAR THE HOLDING AND GOAL DRILL-DOWNS USE. Gate D records
        why it must stay `sticky` rather than `fixed`: it resolves against its
        scroll container and so follows the capped frame for free, where a fixed
        bar would double-count the frame inset.
      */}
      <div className="mvp-finance-detail__actions">
        <Button variant="primary" size="l" label="Edit Commitment" onClick={comingSoon} />
        <Button variant="secondary" size="l" label="Set Reminder" onClick={comingSoon} />
      </div>

      {offer && isInsightOpen ? (
        <SmartInsightModal
          commitment={commitment}
          offer={offer}
          onClose={closeInsight}
          onLearnMore={openEducation}
          onComingSoon={comingSoon}
        />
      ) : null}
      {offer && isEducationOpen ? <InsightEducationModal onClose={closeEducation} /> : null}

      {/*
        THE BASE TOAST RULE, WITH NO `--above-chrome` MODIFIER. That modifier
        exists for `/finance`, which keeps its nav, scrim and FAB; this route is
        `nav: 'suppressed', fab: false` in `chrome.ts`, so the holding
        drill-down's own clearance applies unchanged and no sixth fixed element
        is added.
      */}
      {toast ? (
        <div className="mvp-finance-detail__toast">
          <ToastMobile
            appearance="success"
            title={toast}
            role="status"
            onDismiss={dismissToast}
          />
        </div>
      ) : null}
    </div>
  )
}

/**
 * The one string the four unbuilt controls raise, written once so a spec can
 * assert it without restating it and the four cannot drift apart.
 */
export const COMING_SOON = 'Coming soon.'

/**
 * The promotion banner - Figma's `❖ System message` on its `appearance=ai`
 * variant (`1201:16589`), which the DS ships as `InlineMessage tone="ai"`.
 *
 * NOT ONE LINE OF GRADIENT IS WRITTEN HERE, which is the whole point. The tone
 * paints `--brand-blue-400 -> --brand-blue-500 -> --brand-violet-500` itself,
 * the same token sequence the Steward FAB's `IconObject color="ai"` uses, so
 * the app's three AI surfaces cannot drift. It also supplies the leading
 * `icon_aiinsights` glyph Figma draws, so none is passed.
 *
 * THE SAVING IS DERIVED, NEVER TRANSCRIBED - RM 120 - RM 70 = RM 50. Figma's
 * own education underlay is the argument for deriving it: that layer prints
 * "Save RM 51/month" beside "RM 600/year", and 51 x 12 is 612.
 *
 * IT CARRIES TWO DECIMALS WHERE FIGMA WRITES "RM 50/month". That is this app's
 * standing money divergence - one `formatMyr`, already settled against Figma's
 * "RM 700" on the budget cards and "RM 5040" on the goal drill-down - not a
 * transcription slip.
 */
function OfferBanner({
  commitment,
  offer,
  onView,
}: {
  commitment: Commitment
  offer: CommitmentOffer
  onView: () => void
}) {
  return (
    <InlineMessage
      tone="ai"
      title={`${offer.provider} Promotion Available.`}
      actions={
        <Button variant="tertiary" size="m" label="View" onClick={onView} />
      }
    >
      {`${formatMyr(offerMonthlySaving(commitment, offer))}/month Potential Savings.`}
    </InlineMessage>
  )
}

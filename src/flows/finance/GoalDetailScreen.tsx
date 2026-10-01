import {
  Button,
  HeaderDefault,
  Icon,
  Label,
  ProgressBar,
  StatusBar,
  Tag,
  Toggle,
} from '@monarch/design-system'
import { useCallback, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'

import { useAccounts } from '../../accounts/AccountsProvider'
import { SectionHeader } from '../../components/SectionHeader'
import { goalImageUrl } from '../../config/media'
import { goalContributions, goalPercent, goalTargetLabel } from '../../data/derive'
import { formatMyr } from '../../data/format'
import type { Goal } from '../../data/types'
import { ContributionRow } from './components/ContributionRow'
import { GoalContributionsSheet } from './components/GoalContributionsSheet'
import { FINANCE_TAB_STATE_KEY } from './financeTabs'
import './finance.css'

/**
 * -----------------------------------------------------------------------------
 * FLOW 11 - THE GOAL DRILL-DOWN, `/finance/plans/goals/:goalId` (Gate 78).
 *
 * Figma `Finance_Plan_drilldown` (`1266:14344`), 375 x 864 - taller than the
 * viewport, which is the file's way of saying the screen scrolls.
 *
 * THE ROUTE SHAPE DIVERGES FROM THE BUDGET DRILL-DOWN'S ON PURPOSE. That one is
 * `/finance/budget/<id>`; this is `/finance/plans/goals/<id>`, because the Plans
 * tab holds TWO kinds of detail and a flat `/finance/plans/<id>` could not tell
 * a goal id from a commitment id. The commitment drill-down takes the sibling
 * path at Gate 80. Everything else follows `BudgetDetailScreen` exactly: the
 * param is a route param rather than a route-scoped provider (B8), the goal
 * comes from the app-level `useAccounts()`, the chrome is declared by prefix in
 * `chrome.ts`, and an unknown id redirects to the Plans tab with `replace` so
 * Back cannot return to a dead URL.
 *
 * A GOAL MUST NEVER ACQUIRE A HOLDING DRILL-DOWN ROUTE, and that is structural
 * rather than guarded here: goals are their own collection, so no goal id is in
 * `holdings` or `fiatAccounts` and `/finance/holding/<a goal id>` finds nothing
 * and redirects. `e2e/goal-detail.spec.ts` asserts it both ways.
 *
 * ----------------------- WHAT IS DRAWN BUT NOT WIRED ------------------------
 *
 * Top-Up, Edit Goals, the auto-save toggle, the auto-save pencil and the image
 * pencil are ALL GATE 81's. They render as drawn and do nothing, which is the
 * precedent Gate 67 set for the Budget tab's "Details"/"Add New" and Gate 69
 * for this screen's sibling "Edit": a control the design draws is rendered, and
 * the gate that owns its behaviour is named beside it. "See All" is the one
 * control this gate wires, because the sheet is this gate's deliverable.
 * ---------------------------------------------------------------------------
 */

/**
 * HOW MANY CONTRIBUTIONS THE SCREEN ITSELF SHOWS.
 *
 * FOUR, BECAUSE FIGMA DRAWS FOUR: `Frame 418` is 240px tall, which is exactly
 * 4 x 48 + 3 x 16, so the container is hugging four rows rather than clipping a
 * longer list. The heading is "Recent Contributions" and the row beside it is
 * "See All" - a slice plus a way to the whole, the same shape as the Homepage's
 * `recentTransactions(transactions, 2)`.
 *
 * THE SEEDED GOALS HOLD 16 AND 12, so the slice is load-bearing rather than
 * decorative: without it "See All" would open a sheet identical to the screen.
 *
 * NOT EXPORTED, AND THE SPEC DOES NOT RESTATE IT EITHER. `tsconfig.e2e.json`
 * sets no `jsx`, so a spec cannot import this module at all — which turned out
 * to be the better answer: `goal-detail.spec.ts` reads the rendered row count
 * and asserts the PROPERTY (a newest-first prefix, strictly shorter than the
 * whole list) rather than the number. That cannot drift when this moves.
 */
const RECENT_CONTRIBUTIONS = 4

export function GoalDetailScreen() {
  const navigate = useNavigate()
  const { goalId } = useParams()
  const { goals, transactions } = useAccounts()

  const goal = goals.find((g) => g.id === goalId)

  const backToPlansTab = useCallback(
    () => navigate('/finance', { state: { [FINANCE_TAB_STATE_KEY]: 'plans' } }),
    [navigate],
  )

  const [isSheetOpen, setIsSheetOpen] = useState(false)
  // A stable `onClose` - the G31 convention for anything reaching a DS overlay.
  const closeSheet = useCallback(() => setIsSheetOpen(false), [])

  if (!goal) {
    return <Navigate to="/finance" replace state={{ [FINANCE_TAB_STATE_KEY]: 'plans' }} />
  }

  const contributions = goalContributions(transactions, goal.id)
  const recent = contributions.slice(0, RECENT_CONTRIBUTIONS)

  return (
    <div className="mvp-goal-detail">
      <StatusBar mode="Light" time="9:41" />
      {/* `hasSubtitle={false}` IS LOAD-BEARING: `HeaderDefault` defaults it to
          true with the literal "Subtitle" (the Gate 48 omitted-prop trap).
          Figma draws no action on the right of this header - its right slot is
          an empty 20x20 frame - so `actionLabel` is omitted, not blanked. */}
      <HeaderDefault title={goal.name} hasSubtitle={false} onBack={backToPlansTab} />

      <div className="mvp-goal-detail__body">
        <section className="mvp-column">
          <GoalImage goal={goal} />
        </section>

        {/*
          ONE SECTION, GAP 16, HOLDING THREE CHILDREN - which is `Frame 417`
          exactly. Figma nests the target row and the bar inside a `Frame 439`
          and then puts the auto-save card beside it, but every gap in that
          subtree is 16, so a single column reproduces the geometry without the
          wrapper: 20 + 16 + 36 + 16 + 60 = 148, the frame's own height.
        */}
        <section className="mvp-goal-detail__progress mvp-column">
          {/*
            NOT `SectionHeader`, AND THE REASON IS THE RIGHT-HAND NODE. That
            component's trailing slot is a `Link` - blue, interactive - and this
            row's right-hand node is a plain semibold date. Figma's left node IS
            a `Label` instance (`1066:13575`), so the left half is the DS
            component and the row is composed around it.
          */}
          <div className="mvp-goal-detail__target">
            <Label label="Target" size="s" tone="subtle" />
            <span className="mvp-goal-detail__target-date type-body-sm-semibold">
              {goalTargetLabel(goal)}
            </span>
          </div>
          {/*
            EVERY COLOUR BINDING HERE IS THE DS's OWN AND MATCHES FIGMA EXACTLY:
            the percentage takes `--mapped-text-success-default`, `current` the
            default text colour, the slash the default icon colour and `total`
            the subtle one - which is `936:8586`'s four bindings, in order.

            THE FIGURES ARE `formatMyr`, SO THEY CARRY TWO DECIMALS where Figma
            prints "RM 5040" / "RM 9000". That is this app's standing divergence
            - one money formatter, already settled against Figma's "RM 700" on
            the budget cards - not a transcription slip. Inventory A6 records the
            file contradicting itself on currency formatting inside one modal.
          */}
          <ProgressBar
            size="m"
            value={goalPercent(goal)}
            current={formatMyr(goal.savedAmount)}
            total={formatMyr(goal.targetAmount)}
            ariaLabel={`${goal.name} progress`}
          />
          <AutoSaveCard goal={goal} />
        </section>

        <section className="mvp-goal-detail__contributions mvp-column">
          {/*
            "See All" IS SUPPRESSED WHEN THE SLICE IS THE WHOLE LIST. Figma draws
            the link unconditionally, but it draws a goal with more contributions
            than fit - and a link whose sheet would repeat the four rows directly
            above it is a control that cannot do anything, which Gate 44 ruled is
            worse than no control. Undesigned state, so this is judgement: the
            heading always names the section, the link appears only when there is
            something the screen is not already showing.
          */}
          <SectionHeader
            label="Recent Contributions"
            linkLabel={contributions.length > recent.length ? 'See All' : undefined}
            onLinkClick={() => setIsSheetOpen(true)}
          />
          <ul className="mvp-goal-detail__rows">
            {recent.map((t) => (
              <li key={t.id}>
                <ContributionRow transaction={t} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/*
        THE SAME STICKY BAR THE HOLDING DRILL-DOWN USES, not a goal-specific one.
        `position: sticky; bottom: 0` with `--mapped-gradient-default` behind it
        is this app's answer to content scrolling under a pinned action region,
        and Gate D records why it must stay `sticky` rather than `fixed`: it
        resolves against its scroll container and so follows the capped frame for
        free, where a fixed bar would double-count the frame inset.

        ITS SPACING IS THE APP'S, NOT FIGMA'S, AND THAT IS DELIBERATE. Figma's
        `Frame 445` is gap 16 / padding-top 16; this bar is gap 8 / padding-top
        24. The holding drill-down's bar was drawn in Figma too and shipped with
        these values, so the app has already made this call once - two drill-down
        action bars agreeing with each other is worth more than 8px of agreement
        with one frame whose footer we diverge from anyway (it carries a home
        indicator that the shell owns in this app).
      */}
      <div className="mvp-finance-detail__actions">
        {/* BOTH INERT - Gate 81 wires Top-Up and the goal editor. */}
        <Button variant="primary" size="l" label="Top-Up" />
        {/* "Edit Goals", plural, on a single-goal screen. Transcribed, not
            corrected: inventory A4 records it as a Figma source inconsistency
            and files it "recorded, not corrected". */}
        <Button variant="secondary" size="l" label="Edit Goals" />
      </div>

      {/* MOUNTED CONDITIONALLY, so the sheet starts from the live list every
          time it opens - `TransactionFilterSheet`'s precedent. */}
      {isSheetOpen && (
        <GoalContributionsSheet isOpen onClose={closeSheet} contributions={contributions} />
      )}
    </div>
  )
}

/**
 * The banner photograph, its provenance tag and the (inert) image pencil.
 *
 * THE "Ai Image" TAG IS A DS `Tag` AT `appearance="overlay"`, which is the
 * variant Figma names (`Size=S, Appearance=Overla...`) and which paints
 * `--mapped-surface-overlay-default` - the token Figma binds on that node.
 *
 * IT IS RENDERED UNCONDITIONALLY AND THAT IS A CLAIM THE DATA CANNOT YET CHECK.
 * Both seeded images genuinely are the AI artwork Figma ships, so the badge is
 * true today. `Goal` carries no provenance field, so the day the image picker
 * lands (deferred to persistence) a user-uploaded photograph would wear an
 * "Ai Image" badge that is false. The badge must become conditional on a stored
 * provenance flag at that point; widening `Goal` for it now would be a model
 * change with no consumer.
 *
 * THE PENCIL'S FILL IS AN MVP-LOCAL CORRECTION, NOT A TRANSCRIPTION. Figma
 * paints it a raw `rgba(0,0,0,0.4)` with no variable binding, while the Tag two
 * corners away binds `surface/Overlay/default`. Binding both to
 * `--mapped-surface-overlay-default` gives the two chips on one image the same
 * surface - exactly the reading Gate 50 took for the staged-tile remove button,
 * which had the identical raw-literal-beside-a-bound-sibling shape.
 */
function GoalImage({ goal }: { goal: Goal }) {
  return (
    <div className="mvp-goal-detail__image">
      <img src={goalImageUrl(goal.image)} alt="" />
      <div className="mvp-goal-detail__image-chrome">
        <Tag
          label="Ai Image"
          appearance="overlay"
          size="s"
          iconBefore={<Icon name="icon_aimage" size="s" />}
        />
        {/* INERT - the image picker is deferred to persistence. A real
            <button> rather than a styled div so the affordance keeps its
            focus ring and its role for the gate that wires it. */}
        <button type="button" className="mvp-goal-detail__image-edit" aria-label="Edit image">
          <Icon name="edit" size="s" />
        </button>
      </div>
    </div>
  )
}

/**
 * The auto-save card - caption, amount, pencil, toggle.
 *
 * COMPOSED, NOT A DS CARD. Figma's `877:6595` is a plain frame: a
 * `surface/subtlest/default` fill, radius `md`, padding `Scale/200`, holding two
 * text nodes, a 16px glyph and a DS `Toggle`. Nothing about it is a component
 * the DS ships, and every value it uses is a token.
 *
 * BOTH CONTROLS ARE INERT - Gate 81 owns the auto-save writer. `Toggle` is
 * given `isChecked` and no `onChange`, so it renders the seeded state and does
 * not move; the amount's pencil is the editor's entry point.
 *
 * THE AMOUNT SURVIVES THE TOGGLE BEING OFF, which is `GoalAutoSave`'s stated
 * contract, so this prints `amount` whatever `isEnabled` says - Emergency Funds
 * is the seeded goal that exercises it.
 */
function AutoSaveCard({ goal }: { goal: Goal }) {
  return (
    <div className="mvp-goal-detail__autosave">
      <div className="mvp-goal-detail__autosave-text">
        <span className="mvp-goal-detail__autosave-label type-body-caption-semibold">
          Auto-Save
        </span>
        <span className="mvp-goal-detail__autosave-amount">
          <span className="type-body-m-medium">{formatMyr(goal.autoSave.amount)}/mth</span>
          {/* INERT - Gate 81. */}
          <button
            type="button"
            className="mvp-goal-detail__autosave-edit"
            aria-label="Edit auto-save amount"
          >
            <Icon name="edit" size="s" />
          </button>
        </span>
      </div>
      <Toggle
        size="l"
        isChecked={goal.autoSave.isEnabled}
        ariaLabel={`Auto-save for ${goal.name}`}
      />
    </div>
  )
}

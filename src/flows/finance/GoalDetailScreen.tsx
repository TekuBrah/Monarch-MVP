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
import { useCallback, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'

import { useAccounts } from '../../accounts/AccountsProvider'
import { SectionHeader } from '../../components/SectionHeader'
import { goalImageUrl } from '../../config/media'
import {
  goalContributions,
  goalPercent,
  goalTargetLabel,
  newReference,
} from '../../data/derive'
import { formatMyr } from '../../data/format'
import { localWallClock } from '../../data/today'
import type { Goal, Transaction } from '../../data/types'
import { ContributionRow } from './components/ContributionRow'
import { GoalContributionsSheet } from './components/GoalContributionsSheet'
import {
  AutoSaveAmountModal,
  GoalDeleteConfirm,
  GoalFormModal,
} from './components/GoalFormModal'
import { TopUpModal } from './components/TopUpModal'
import { FINANCE_TAB_STATE_KEY, GOAL_DELETED_STATE_KEY } from './financeTabs'
import { goalSettingsOf, type GoalSettings } from './goalDraft'
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
 * TOP-UP IS WIRED AS OF GATE 81 — it is the first control in this app that
 * MOVES MONEY, and `confirmTopUp` below builds the row the provider writes.
 *
 * STILL DRAWN AND INERT: "Edit Goals", the auto-save toggle, the auto-save
 * pencil and the image pencil, all GATE 81-B's. They render as drawn and do
 * nothing, which is the precedent Gate 67 set for the Budget tab's
 * "Details"/"Add New" and Gate 69 for this screen's sibling "Edit": a control
 * the design draws is rendered, and the gate that owns its behaviour is named
 * beside it.
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
  const { goals, transactions, fiatAccounts, topUpGoal, updateGoal, deleteGoal } =
    useAccounts()

  const goal = goals.find((g) => g.id === goalId)

  const backToPlansTab = useCallback(
    () => navigate('/finance', { state: { [FINANCE_TAB_STATE_KEY]: 'plans' } }),
    [navigate],
  )

  const [isSheetOpen, setIsSheetOpen] = useState(false)
  // A stable `onClose` - the G31 convention for anything reaching a DS overlay.
  const closeSheet = useCallback(() => setIsSheetOpen(false), [])

  const [isTopUpOpen, setIsTopUpOpen] = useState(false)
  const closeTopUp = useCallback(() => setIsTopUpOpen(false), [])

  const [isEditing, setIsEditing] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isEditingAutoSave, setIsEditingAutoSave] = useState(false)
  const closeEdit = useCallback(() => {
    setIsConfirmingDelete(false)
    setIsEditing(false)
  }, [])
  const cancelDelete = useCallback(() => setIsConfirmingDelete(false), [])
  const closeAutoSave = useCallback(() => setIsEditingAutoSave(false), [])
  const isDeleting = useRef(false)

  /**
   * THE SCREEN BUILDS THE ROW AND THE PROVIDER WRITES IT — Gate 81.
   *
   * IDENTITY IS THE CALLER'S, which is the contract `addTransaction` has
   * documented since Gate 48 and `addReceipt` repeats: a mutator appends, and
   * nothing about the row is decided inside it. `txn-${crypto.randomUUID()}`
   * follows `BudgetsProvider`'s `budget-${crypto.randomUUID()}` — the app has no
   * general id generator, and `receipt-capture-N` is a counter private to
   * `receiptCapture.ts`. `randomUUID` needs a secure context, which localhost
   * and the https deploy both are.
   *
   * ⚠ THE AMOUNT IS NEGATED HERE, AND THAT IS THE LEDGER'S CONVENTION RATHER
   * THAN A CHOICE. A row's sign is relative to its own `accountId` — a Maybank
   * credit is +5,200 ON `main`, a crypto send is −350.69 ON `marg` — and the
   * money is LEAVING the cash account, so the row is an outflow. All 28 seeded
   * contributions are negative for exactly this reason (Gate 77 ruled it: the
   * alternative, a positive row on the goal's own id, would read as green
   * income in the ledger and would leave `transactionAccount` with no
   * institution to print).
   *
   * `merchant` IS THE GOAL'S NAME, matching the 28 seeded contributions, which
   * is what makes the written row indistinguishable from them on every surface
   * that renders a merchant — the ledger, the account drill-down and the
   * Homepage slice. `logo` is the goal's own photograph through the `goal` tag
   * `TransactionLogo` gained at Gate 77.
   *
   * `kind: 'transfer'` IS WHAT KEEPS IT OUT OF EVERY BUDGET, structurally:
   * `countsToward` tests kind FIRST and rejects on it, so no budget figure can
   * move however the amount, category or date fall. `category: 'others'` matches
   * the seeded contributions and is inert for the same reason.
   */
  const confirmTopUp = useCallback(
    (amount: number, sourceId: string) => {
      if (!goal) return
      const occurredAt = localWallClock(new Date())
      const contribution: Transaction = {
        id: `txn-${crypto.randomUUID()}`,
        accountId: sourceId,
        merchant: goal.name,
        logo: { kind: 'goal', filename: goal.image, origin: goal.imageOrigin },
        method: 'Fund Transfer',
        kind: 'transfer',
        amount: -amount,
        currency: 'MYR',
        occurredAt,
        category: 'others',
        goalId: goal.id,
        contributionSource: 'manual',
        reference: newReference(occurredAt),
      }
      topUpGoal(contribution)
      setIsTopUpOpen(false)
    },
    [goal, topUpGoal],
  )

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * DELETING A GOAL RETURNS WHAT IT HELD TO ITS FUNDING ACCOUNT — Teku's
   * ruling, and the row that does it is built here for `confirmTopUp`'s reason:
   * THE SCREEN BUILDS THE ROW AND THE PROVIDER WRITES IT.
   *
   * WHY A RETURN AND NOT A DESTRUCTION. The two alternatives are worse in
   * opposite directions: silently destroying saved money is the single most
   * damaging thing this app could do, and refusing to delete until the goal is
   * emptied leaves a user with no way to close a goal at all. Monzo and Revolut
   * both return a pot's or a vault's balance to the main account on closing,
   * and a funding account on the record means this needs no picker to ask
   * where.
   *
   * ⚠ THE SIGN IS POSITIVE AND THE `accountId` IS THE CASH ACCOUNT — the exact
   * mirror of a contribution, and for the same reason. A row's sign is relative
   * to its own `accountId`, and the money is ARRIVING at the funding account,
   * so this is a credit on that account. `movementParties` then reads it as
   * from = the goal, to = the account, which is what happened.
   *
   * ⚠ IT IS STILL `kind: 'transfer'`, SO IT NEVER READS AS INCOME.
   * `transactionDisposition` tests kind FIRST, so a positive transfer is a
   * transfer — and `countsToward` rejects it on that same first clause, so no
   * budget moves. That ordering is load-bearing and is why the refund cannot be
   * mistaken for money the user earned.
   *
   * ⚠ `merchant` CARRIES THE GOAL'S NAME, WHICH IS WHAT SURVIVES THE DELETE.
   * `movementParties` looks a goal up by id and falls back to `merchant` when
   * the lookup misses — its own documented behaviour since Gate 79, "A `goalId`
   * NAMING NO GOAL FALLS BACK TO `merchant` rather than returning undefined. A
   * detail sheet is a rendering, not a place to discover a bad join." So the
   * history of a deleted goal keeps reading correctly with no snapshot field,
   * no stored label written at delete time and no tombstone: the label has been
   * on every one of these rows since Gate 77, and the fallback has been waiting
   * for the first writer that could reach it. This is that writer.
   *
   * NO `contributionSource`. That field says whether a CONTRIBUTION was
   * automatic or manual; a refund is neither, and the detail sheet omits the
   * "Type" row rather than printing a third value the enum does not have.
   * ═══════════════════════════════════════════════════════════════════════════
   */
  const confirmDelete = useCallback(() => {
    if (!goal) return
    const held = goal.savedAmount
    let refund: Transaction | null = null
    if (held > 0) {
      const occurredAt = localWallClock(new Date())
      refund = {
        id: `txn-${crypto.randomUUID()}`,
        accountId: goal.fundingAccountId,
        merchant: goal.name,
        logo: { kind: 'goal', filename: goal.image, origin: goal.imageOrigin },
        method: 'Fund Transfer',
        kind: 'transfer',
        amount: held,
        currency: 'MYR',
        occurredAt,
        category: 'others',
        goalId: goal.id,
        reference: newReference(occurredAt),
      }
    }

    /*
      THE NAVIGATION GOES FIRST AND THE UNKNOWN-ID BACKSTOP MUST NOT BEAT IT —
      `BudgetDetailScreen`'s measured race, in the same shape. React Router runs
      `navigate` as a transition while the provider write is an ordinary update,
      so the write commits FIRST and this screen renders once with no goal;
      without the guard its `<Navigate>`, which carries no flag, wins and the
      toast never shows. `replace` so Back never lands on the dead route.
    */
    isDeleting.current = true
    navigate('/finance', {
      replace: true,
      state: { [FINANCE_TAB_STATE_KEY]: 'plans', [GOAL_DELETED_STATE_KEY]: true },
    })
    deleteGoal(goal.id, refund)
  }, [deleteGoal, goal, navigate])

  /** Settings only — `GoalSettings` cannot name `savedAmount`. */
  const saveEdits = useCallback(
    (settings: GoalSettings) => {
      if (!goal) return
      updateGoal(goal.id, settings)
      setIsEditing(false)
    },
    [goal, updateGoal],
  )

  /**
   * THE SWITCH WRITES IMMEDIATELY, with no confirmation and no toast.
   *
   * IT IS REVERSIBLE IN ONE TAP AND IT MOVES NO MONEY — nothing in this app
   * runs on a timer, so turning auto-save on schedules nothing and turning it
   * off cancels nothing. Gate 51's rule is confirm only what cannot be undone,
   * and toast only when the surface the user acted on disappears; this is
   * neither. The switch itself is the feedback.
   *
   * THE AMOUNT IS CARRIED THROUGH UNCHANGED, which is `GoalAutoSave`'s stated
   * contract: switching off and on again must not forget the figure.
   */
  const toggleAutoSave = useCallback(
    (isEnabled: boolean) => {
      if (!goal) return
      updateGoal(goal.id, { ...goalSettingsOf(goal), autoSave: { ...goal.autoSave, isEnabled } })
    },
    [goal, updateGoal],
  )

  const saveAutoSaveAmount = useCallback(
    (amount: number) => {
      if (!goal) return
      updateGoal(goal.id, { ...goalSettingsOf(goal), autoSave: { ...goal.autoSave, amount } })
      setIsEditingAutoSave(false)
    },
    [goal, updateGoal],
  )

  /**
   * THE IMAGE PICKER — Flow 9's own shape, reused rather than re-invented.
   *
   * ⚠ IT GATES THE "Ai Image" BADGE, which is the user-visible half of this
   * change and the thing Gate 78 asked for in writing: "The badge must become
   * conditional on a stored provenance flag at that point." `imageOrigin` goes
   * to `'upload'`, so the badge stops rendering on that goal.
   *
   * IN MEMORY, NO NETWORK, NOTHING LEAVES THE DEVICE — the `URL.createObjectURL`
   * path `receiptCapture.ts` already uses. The url does not survive a reload,
   * which is correct rather than a defect: nothing here is persisted (NP1) and
   * a reload restores the seeded artwork along with everything else.
   */
  const chooseImage = useCallback(
    (file: File) => {
      if (!goal) return
      updateGoal(goal.id, {
        ...goalSettingsOf(goal),
        image: URL.createObjectURL(file),
        imageOrigin: 'upload',
      })
    },
    [goal, updateGoal],
  )

  if (!goal) {
    // The delete owns this frame while it navigates — see `confirmDelete`.
    if (isDeleting.current) return null
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
          <GoalImage goal={goal} onChoose={chooseImage} />
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
          <AutoSaveCard
            goal={goal}
            onToggle={toggleAutoSave}
            onEditAmount={() => setIsEditingAutoSave(true)}
          />
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
        <Button
          variant="primary"
          size="l"
          label="Top-Up"
          onClick={() => setIsTopUpOpen(true)}
        />
        {/* "Edit Goals", plural, on a single-goal screen. Transcribed, not
            corrected: inventory A4 records it as a Figma source inconsistency
            and files it "recorded, not corrected". */}
        <Button
          variant="secondary"
          size="l"
          label="Edit Goals"
          onClick={() => setIsEditing(true)}
        />
      </div>

      {/* MOUNTED CONDITIONALLY, so the sheet starts from the live list every
          time it opens - `TransactionFilterSheet`'s precedent. */}
      {isSheetOpen && (
        <GoalContributionsSheet isOpen onClose={closeSheet} contributions={contributions} />
      )}

      {/* Mounted conditionally for the same reason, so the form starts empty. */}
      {isTopUpOpen && (
        <TopUpModal
          goal={goal}
          accounts={fiatAccounts}
          defaultSourceId={goal.fundingAccountId}
          onClose={closeTopUp}
          onConfirm={confirmTopUp}
        />
      )}

      {/* Mounted conditionally so each open seeds from the stored goal. */}
      {isEditing && (
        <GoalFormModal
          mode="edit"
          goal={goal}
          accounts={fiatAccounts}
          onClose={closeEdit}
          onSave={saveEdits}
          onDelete={() => setIsConfirmingDelete(true)}
        />
      )}
      {isEditing && isConfirmingDelete && (
        <GoalDeleteConfirm
          goal={goal}
          accounts={fiatAccounts}
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
        />
      )}
      {isEditingAutoSave && (
        <AutoSaveAmountModal
          goal={goal}
          onClose={closeAutoSave}
          onSave={saveAutoSaveAmount}
        />
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
 * ⚠ IT IS NOW CONDITIONAL, AND THIS IS THE POINT GATE 78 NAMED IN WRITING.
 * That gate shipped the badge unconditionally and recorded why: "`Goal` carries
 * no provenance field, so the day the image picker lands a user-uploaded
 * photograph would wear an 'Ai Image' badge that is false. The badge must
 * become conditional on a stored provenance flag at that point." The picker is
 * here, the flag is `Goal.imageOrigin`, and the badge draws for `'ai'` alone.
 *
 * IT MOVES NO PIXEL ON EITHER SEEDED GOAL, because both are `'ai'` — the claim
 * Gate 78 made is now checked rather than assumed, and it holds.
 *
 * THE PENCIL'S FILL IS AN MVP-LOCAL CORRECTION, NOT A TRANSCRIPTION. Figma
 * paints it a raw `rgba(0,0,0,0.4)` with no variable binding, while the Tag two
 * corners away binds `surface/Overlay/default`. Binding both to
 * `--mapped-surface-overlay-default` gives the two chips on one image the same
 * surface - exactly the reading Gate 50 took for the staged-tile remove button,
 * which had the identical raw-literal-beside-a-bound-sibling shape.
 */
function GoalImage({ goal, onChoose }: { goal: Goal; onChoose: (file: File) => void }) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <div className="mvp-goal-detail__image">
      <img src={goalImageUrl(goal.image, goal.imageOrigin)} alt="" />
      <div className="mvp-goal-detail__image-chrome">
        {goal.imageOrigin === 'ai' && (
          <Tag
            label="Ai Image"
            appearance="overlay"
            size="s"
            iconBefore={<Icon name="icon_aimage" size="s" />}
          />
        )}
        {/*
          WIRED AT GATE 81-B. It was already a real <button> rather than a
          styled div precisely so this gate replaced a handler rather than the
          markup — the shape Gate 41 left the transactions filter control in,
          and the same saving here.

          THE INPUT IS HIDDEN AND THE BUTTON FIRES IT, which is Flow 9's
          pattern (`ReceiptFileInput`): a visible control with an accessible
          name, and an input the user never sees. `accept="image/*"` keeps the
          wildcard so a device's own formats (HEIC, WebP) are admitted without
          being enumerated.
        */}
        <button
          type="button"
          className="mvp-goal-detail__image-edit"
          aria-label="Edit image"
          onClick={() => input.current?.click()}
        >
          <Icon name="edit" size="s" />
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            /* The input keeps its value, so re-choosing the same file fires
               `change` again — `ReceiptFileInput`'s reset, for its reason. */
            e.target.value = ''
            if (file) onChoose(file)
          }}
        />
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
 * BOTH CONTROLS ARE WIRED AT GATE 81-B, and they write DIFFERENT THINGS. The
 * switch flips `isEnabled` in place — no confirmation and no toast, because it
 * is reversible in one tap and it moves no money (nothing here runs on a
 * timer). The pencil opens a one-field editor for the AMOUNT and deliberately
 * does not touch the switch: a pencil that silently enabled a monthly
 * transfer would be the most surprising write in this app.
 *
 * ⚠ NEITHER MOVES A PIXEL BY BEING WIRED. DS `Toggle` emits
 * `onChange={e => onChange?.(e.target.checked)}` unconditionally in its JSX
 * (read from source at v2.8.0), so an absent handler and a present one render
 * the identical DOM; the pencil was already a real <button>.
 *
 * THE AMOUNT SURVIVES THE TOGGLE BEING OFF, which is `GoalAutoSave`'s stated
 * contract, so this prints `amount` whatever `isEnabled` says - Emergency Funds
 * is the seeded goal that exercises it.
 */
function AutoSaveCard({
  goal,
  onToggle,
  onEditAmount,
}: {
  goal: Goal
  onToggle: (isEnabled: boolean) => void
  onEditAmount: () => void
}) {
  return (
    <div className="mvp-goal-detail__autosave">
      <div className="mvp-goal-detail__autosave-text">
        <span className="mvp-goal-detail__autosave-label type-body-caption-semibold">
          Auto-Save
        </span>
        <span className="mvp-goal-detail__autosave-amount">
          <span className="type-body-m-medium">{formatMyr(goal.autoSave.amount)}/mth</span>
          <button
            type="button"
            className="mvp-goal-detail__autosave-edit"
            aria-label="Edit auto-save amount"
            onClick={onEditAmount}
          >
            <Icon name="edit" size="s" />
          </button>
        </span>
      </div>
      <Toggle
        size="l"
        isChecked={goal.autoSave.isEnabled}
        onChange={onToggle}
        ariaLabel={`Auto-save for ${goal.name}`}
      />
    </div>
  )
}

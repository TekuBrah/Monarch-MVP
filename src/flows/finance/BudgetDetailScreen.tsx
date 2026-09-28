import { useCallback, useRef, useState } from 'react'
import {
  ChartLegendItem,
  DonutChart,
  HeaderDefault,
  Icon,
  IconObject,
  ListItem,
  ProgressRing,
  StatusBar,
} from '@monarch/design-system'
import type { DonutSegment, IconName } from '@monarch/design-system'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAccounts } from '../../accounts/AccountsProvider'
import { useBudgets } from '../../budgets/BudgetsProvider'
import { SectionHeader } from '../../components/SectionHeader'
import { TransactionMark } from '../../components/TransactionMark'
import {
  budgetAvailable,
  budgetLegend,
  budgetPercentLeft,
  budgetPeriodLabel,
  budgetSpent,
  transactionCategory,
  transactionHasReceipt,
} from '../../data/derive'
import { formatMyr, formatPercent, formatSignedMyr, formatTimestamp } from '../../data/format'
import type { Amount, TransactionCategoryId } from '../../data/types'
import { BudgetDeleteConfirm, BudgetFormModal } from './components/BudgetFormModal'
import { BUDGET_DELETED_STATE_KEY, FINANCE_TAB_STATE_KEY } from './financeTabs'
import './finance.css'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Flow 10 — the budget drilldown (`Finance_Budget_drilldown`, Figma
 * `1266:14337`). Gate 69.
 *
 * A ROUTE PER BUDGET, `/finance/budget/:budgetId`, beside the holding
 * drill-downs, and for the same reasons: its own chrome (nav suppressed, no FAB
 * — `chrome.ts`), and the budget comes from the app-level `useBudgets()`, not a
 * route-scoped provider (B8). An unknown id — which is what a deleted budget
 * becomes — redirects to the Budget tab with `replace`, so Back cannot return
 * to the dead URL. Delete itself (Gate 71) navigates there with `replace`
 * too, so the redirect is only the backstop.
 *
 * "EDIT" IS WIRED (Gate 71, Decision 6): the header's action link is the ONLY
 * edit entry point — no pencils — and opens "Edit Budget", the Create form
 * pre-filled. Save Changes writes the record and STAYS here: every figure below
 * re-derives from the stored budget on the next render, with nothing to
 * refresh. Its "Delete budget" (Decision 7A) raises a confirmation that STACKS
 * over it, so Cancel returns to the edit unchanged.
 *
 * BACK RETURNS TO THE BUDGET TAB, NOT OVERVIEW. The Finance tabs stay in-screen
 * `useState` (Flow 7 B7); Back hands the tab id over in ROUTER LOCATION STATE
 * and `FinanceScreen`'s initialiser reads it once. The URL is still `/finance`.
 *
 * ─────────────────────────── EVERY FIGURE IS DERIVED ───────────────────────────
 *
 * Figma's own numbers (RM 700 / RM 6,800, 18%, RM 2,500.00 …) come from no
 * ledger. The gauge, the info rows and the donut read the Gate 67 derivations;
 * the legend and its nested rows read `budgetLegend`, which is the SAME set of
 * rows `budgetSpent` sums, split by category. So the donut's centre — the sum of
 * its segments — equals `budgetSpent` by construction, and the spec asserts it.
 *
 * TWO DIVERGENCES FROM THE FRAME, BOTH RECORDED:
 *  - "Expenses Summary" renders through `SectionHeader`, so it binds
 *    `text/subtle/default` where Figma draws `text/default/default`. Gate 6's
 *    ruling is that every section heading goes through the one component.
 *  - (Closed at Gate 71.) The Spent row draws `icon_spend`, which DS v2.6.0
 *    added from the DS Figma file's `icon_Spend` (gap-register G41). Until then
 *    its glyph slot was left EMPTY rather than filled with a near-miss.
 * ─────────────────────────────────────────────────────────────────────────────
 */

function availableLabel(available: Amount): string {
  return available < 0 ? formatSignedMyr(available) : formatMyr(available)
}

interface InfoRow {
  label: string
  icon: IconName
  value: string
}

export function BudgetDetailScreen() {
  const navigate = useNavigate()
  const { budgetId } = useParams()
  const { budgets, updateBudget, deleteBudget } = useBudgets()
  const { transactions, receipts } = useAccounts()

  const budget = budgets.find((b) => b.id === budgetId)
  const legend = budget ? budgetLegend(budget, transactions) : []

  /*
    DECISION E — ONLY THE LARGEST-SPEND CATEGORY STARTS OPEN, i.e. the first
    legend row. A category with nothing spent has nothing to disclose, so the
    initialiser opens nothing when even the first row is empty.

    INDEPENDENT DISCLOSURES, NOT AN ACCORDION: a SET of open ids, so opening one
    row never closes another (the WAI disclosure pattern).
  */
  const [open, setOpen] = useState<ReadonlySet<TransactionCategoryId>>(() =>
    legend[0] && legend[0].rows.length > 0 ? new Set([legend[0].category]) : new Set(),
  )

  const backToBudgetTab = () =>
    navigate('/finance', { state: { [FINANCE_TAB_STATE_KEY]: 'budget' } })

  const [isEditing, setIsEditing] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  // Stable `onClose`s — the G31 convention for anything reaching a DS overlay.
  const closeEdit = useCallback(() => {
    setIsConfirmingDelete(false)
    setIsEditing(false)
  }, [])
  const cancelDelete = useCallback(() => setIsConfirmingDelete(false), [])
  const isDeleting = useRef(false)

  /*
    DELETE NAVIGATES WITH THE "Budget deleted" FLAG, AND THE UNKNOWN-ID BACKSTOP
    MUST NOT BEAT IT. React Router runs `navigate` as a transition, while the
    provider write is an ordinary update — so the write commits FIRST and this
    screen renders once with no budget (measured: without the guard the
    backstop's `<Navigate>`, which carries no flag, won and the toast never
    showed). `isDeleting` makes that one render return nothing and leave the
    navigation to the delete. `replace` so Back never lands on the dead route;
    the flag is read and cleared by the Budget tab (`financeTabs.ts`).
  */
  const confirmDelete = (id: string) => {
    isDeleting.current = true
    navigate('/finance', {
      replace: true,
      state: { [FINANCE_TAB_STATE_KEY]: 'budget', [BUDGET_DELETED_STATE_KEY]: true },
    })
    deleteBudget(id)
  }

  if (!budget) {
    if (isDeleting.current) return null
    return <Navigate to="/finance" replace state={{ [FINANCE_TAB_STATE_KEY]: 'budget' }} />
  }

  const available = budgetAvailable(budget, transactions)
  const spent = budgetSpent(budget, transactions)

  /* THE DONUT'S CENTRE IS THE SUM OF ITS SEGMENTS, not a second call to
     `budgetSpent` — so what the ring draws and what it prints are one sum.

     G42, CLOSED BY DS v2.6.0 (Gate 71): a budget with ONE category draws one
     segment, which the DS renders as a stroked ring, and its `--ring` modifier
     now sets `fill: none`, so the hole stays empty whatever the number of
     categories. Entertainment shows it; the Gate 71 writer spec asserts it by
     computed fill and by hit-test. Nothing was overridden here. */
  const withSpend = legend.filter((entry) => entry.spent > 0)
  const segments: DonutSegment[] = withSpend.map((entry) => ({
    id: entry.category,
    label: transactionCategory(entry.category)?.label ?? entry.category,
    value: entry.spent,
    color: transactionCategory(entry.category)!.hue,
  }))
  const segmentTotal = withSpend.reduce((sen, entry) => sen + Math.round(entry.spent * 100), 0) / 100

  const info: InfoRow[] = [
    { label: 'Budget', icon: 'icon_budget', value: formatMyr(budget.limit) },
    { label: 'Duration', icon: 'icon_duration', value: budgetPeriodLabel(budget) },
    { label: 'Available', icon: 'icon_wallet', value: availableLabel(available) },
    { label: 'Spent', icon: 'icon_spend', value: formatMyr(spent) },
  ]

  const toggle = (category: TransactionCategoryId, next: boolean) =>
    setOpen((current) => {
      const updated = new Set(current)
      if (next) updated.add(category)
      else updated.delete(category)
      return updated
    })

  return (
    <div className="mvp-budget-detail">
      <StatusBar mode="Light" time="9:41" />
      {/* `hasSubtitle={false}` IS LOAD-BEARING: `HeaderDefault` defaults it to
          true with the literal "Subtitle" (the Gate 48 omitted-prop trap). */}
      <HeaderDefault
        title={budget.name}
        hasSubtitle={false}
        actionLabel="Edit"
        onAction={() => setIsEditing(true)}
        onBack={backToBudgetTab}
      />

      <div className="mvp-budget-detail__body">
        <section className="mvp-budget-detail__gauge mvp-column">
          <ProgressRing
            size="l"
            value={budgetPercentLeft(budget, transactions)}
            caption="Left to Spend"
            amount={availableLabel(available)}
            total={formatMyr(budget.limit)}
            ariaLabel={`${budget.name}, left to spend`}
          />
        </section>

        {/* Figma's `card/fixed deposit info` (`0:324`) is DETACHED, so it is
            composed from DS primitives. NO PENCILS (Decision 6), and every value
            takes the same colour. */}
        <section className="mvp-column">
          <dl className="mvp-budget-detail__info">
            {info.map((row) => (
              <div key={row.label} className="mvp-budget-detail__info-row">
                <dt className="mvp-budget-detail__info-label type-body-m-medium">
                  <IconObject color="slate" shape="circle" size="l">
                    <Icon name={row.icon} size="m" />
                  </IconObject>
                  {row.label}
                </dt>
                <dd className="mvp-budget-detail__info-value type-body-m-medium">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mvp-budget-detail__summary mvp-column">
          <SectionHeader label="Expenses Summary" />
          <div className="mvp-budget-detail__donut">
            <DonutChart segments={segments} centreLabel={formatMyr(segmentTotal)} />
          </div>
        </section>

        <section className="mvp-column">
          <ul className="mvp-budget-detail__legend">
            {legend.map((entry) => {
              const category = transactionCategory(entry.category)!
              const regionId = `budget-legend-${entry.category}`
              const canExpand = entry.rows.length > 0
              const isOpen = canExpand && open.has(entry.category)
              return (
                <li
                  key={entry.category}
                  className={[
                    'mvp-budget-detail__legend-entry',
                    isOpen && 'mvp-budget-detail__legend-entry--open',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <ChartLegendItem
                    icon={<Icon name={category.icon} size="m" />}
                    iconColor={category.hue}
                    title={category.label}
                    subtitle={formatPercent(entry.share)}
                    amount={formatMyr(entry.spent)}
                    /* A zero-spend category has nothing to disclose: no chevron,
                       and not a disclosure at all (`expanded` left undefined). */
                    hasChevron={canExpand}
                    expanded={canExpand ? isOpen : undefined}
                    onExpandedChange={canExpand ? (next) => toggle(entry.category, next) : undefined}
                    controlsId={canExpand ? regionId : undefined}
                  />
                  {canExpand && (
                    <ul id={regionId} className="mvp-budget-detail__rows" hidden={!isOpen}>
                      {entry.rows.map((txn) => (
                        <li key={txn.id}>
                          {/* The Transactions tab's own row: `ListItem` +
                              `TransactionMark`, glyph DERIVED (Gate 53-B). */}
                          <ListItem
                            type="default"
                            leading={<TransactionMark mark={txn.logo} size="m" />}
                            title={txn.merchant}
                            titleInfo={txn.method}
                            amount={formatSignedMyr(txn.amount)}
                            amountInfo={formatTimestamp(txn.occurredAt)}
                            hasReceiptIcon={transactionHasReceipt(receipts, txn.id)}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      {isEditing && (
        <BudgetFormModal
          mode="edit"
          budget={budget}
          onClose={closeEdit}
          onSave={(input) => {
            updateBudget(budget.id, input)
            setIsEditing(false)
          }}
          onDelete={() => setIsConfirmingDelete(true)}
        />
      )}
      {isEditing && isConfirmingDelete && (
        <BudgetDeleteConfirm
          name={budget.name}
          onCancel={cancelDelete}
          onConfirm={() => confirmDelete(budget.id)}
        />
      )}
    </div>
  )
}

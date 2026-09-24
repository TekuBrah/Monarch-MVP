import { CardMonthlyBudget } from '@monarch/design-system'
import { useAccounts } from '../../accounts/AccountsProvider'
import { useBudgets } from '../../budgets/BudgetsProvider'
import {
  budgetAvailable,
  budgetPercentLeft,
  budgetPeriodLabel,
  budgetSpent,
} from '../../data/derive'
import { formatMyr, formatSignedMyr } from '../../data/format'
import type { Amount } from '../../data/types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Flow 10 — the Budget tab (`Finance_Budget`, Figma `1266:14334`). Gate 67.
 *
 * One DS `CardMonthlyBudget` per budget, in seed order, then the `addNew` card.
 * Figma's `Frame 452` is a column with a 16px side inset and 12px between cards:
 * `.mvp-column` supplies the inset from `--mvp-gutter` and `.mvp-budget` the gap.
 *
 * `sizing="fill"` ON EVERY CARD, INCLUDING `addNew` — the precedent the app
 * already uses for `Field` and `Select`. The card is a flex item of a COLUMN, so
 * `align-items: stretch` gives it the column's width: 343 at 375 (Figma's own
 * box) and 398 at 430, where `fixed` would leave 55px empty.
 *
 * ─────────────────────────── EVERY FIGURE IS DERIVED ───────────────────────────
 *
 * Decision 2A: spent is the outflows in the budget's categories dated inside its
 * range. The ring and the "N%" label take ONE integer (`budgetPercentLeft`,
 * floored and clamped), so they cannot disagree. The ring's centre amount is
 * AVAILABLE, which is what Figma draws there (its "RM 700" is also the
 * "Available" row).
 *
 * TWO DECIMALS, NOT FIGMA'S WHOLE NUMBERS. Figma prints "RM 700" because its
 * figures happened to be whole. `formatMyr` always prints two decimals, and the
 * formatter rule wins. This is a recorded divergence, not a defect.
 *
 * OVERSPENT (undrawn in Figma). Available prints NEGATIVE, through
 * `formatSignedMyr`, which is only used when the figure is below zero. A
 * positive "+RM" would read as income. The ring shows 0. There is no warning
 * colour: `--mapped-text-warning-default` fails contrast and is paused for the
 * DS round.
 * ─────────────────────────────────────────────────────────────────────────────
 */
function availableLabel(available: Amount): string {
  return available < 0 ? formatSignedMyr(available) : formatMyr(available)
}

/*
  EXPLICIT NO-OPS, EACH NAMED FOR THE GATE THAT WIRES IT. No route, no toast.
*/
// Gate 68 wires "Details" to the budget drilldown.
const openDetails = () => {}
// Gate 69 wires "Add New Budget" to the Create modal.
const openCreate = () => {}

export function BudgetTab() {
  const { budgets } = useBudgets()
  const { transactions } = useAccounts()

  return (
    <div className="mvp-budget mvp-column">
      {budgets.map((budget) => {
        const available = budgetAvailable(budget, transactions)
        return (
          <CardMonthlyBudget
            key={budget.id}
            title={budget.name}
            period={budgetPeriodLabel(budget)}
            percentage={budgetPercentLeft(budget, transactions)}
            amountLeft={availableLabel(available)}
            totalAmount={formatMyr(budget.limit)}
            availableAmount={availableLabel(available)}
            spentAmount={formatMyr(budgetSpent(budget, transactions))}
            onDetailsClick={openDetails}
            sizing="fill"
          />
        )
      })}
      <CardMonthlyBudget state="addNew" onAddNew={openCreate} sizing="fill" />
    </div>
  )
}

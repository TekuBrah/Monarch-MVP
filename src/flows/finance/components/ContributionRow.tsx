import { ChartLegendItem } from '@monarch/design-system'

import { contributionSourceLabel } from '../../../data/derive'
import { formatMyr } from '../../../data/format'
import { formatDayMonth } from '../../../data/today'
import type { Transaction } from '../../../data/types'

/**
 * -----------------------------------------------------------------------------
 * ONE CONTRIBUTION, AS A ROW (Gate 78).
 *
 * COMPOSITION, NOT A PRIMITIVE (rule 4): it picks a DS component's props out of
 * a ledger row and owns no stylesheet. It exists as a component because there
 * are TWO call sites - the goal drill-down's four-row slice and the "See All"
 * sheet's whole list - and the three decisions below have to agree between
 * them.
 *
 * ----------------------- THE FOUR PROPS, AND WHY EACH -----------------------
 *
 * `variant="contribution"` IS THE WHOLE REASON THIS USES `ChartLegendItem`.
 * The DS ships it described as "Recent contributions item", and it is what
 * swaps the title and amount from semibold to medium weight and drops the
 * trailing chevron (`showIcon`/`isLegend` in `ChartLegendItem.tsx`). The
 * default is `'legend'`, so omitting it would draw a budget-donut row.
 *
 * `hasIcon={false}` IS PASSED, NOT OMITTED, AND THAT IS THE OMITTED-PROP TRAP
 * AGAIN. `ChartLegendItem` defaults `icon` to `<Icon name="question_mark" />`
 * and `hasIcon` to `true`, and on the `contribution` variant `showIcon` is
 * exactly `hasIcon` - so leaving both out draws a grey question-mark badge on
 * every row. Figma draws no leading badge at all: its rows' text starts at the
 * container's left edge (`879:6558`, read through `get_design_context`). This
 * is the sixth instance of this trap in this repo, after `Link.iconBefore`,
 * `ReceiptCard`, the holding drill-down at Gate 53-B, `HeaderDefault`'s
 * `hasSubtitle` and `ListItem.hasReceiptIcon`.
 *
 * `amount` TAKES THE MAGNITUDE, because a contribution row in the LEDGER is
 * negative - it debits `main`, and this ledger's sign is relative to
 * `accountId` - while the goal's own screen is showing money arriving. Figma
 * prints "RM 250.00", unsigned. `goalContributions`' own docstring states this
 * and says a caller takes the magnitude rather than expecting a positive number
 * back; `Math.abs` here is that caller doing so. `formatSignedMyr` would be the
 * wrong formatter twice over: it prints a sign, and the sign it would print is
 * the debit's.
 *
 * `subtitle` IS `formatDayMonth`, which gives "11 Sept" - Figma's own subtitle
 * format, including the zero-padded day it draws on "05 Sept", and including
 * the `sept()` correction `today.ts` applies to Intl's "Sep".
 *
 * ------------------------- THE NON-NULL ASSERTION ---------------------------
 *
 * `contributionSource!` RESTS ON A STATED MODEL INVARIANT, NOT ON HOPE.
 * `types.ts` says the field "MUST BE SET EXACTLY WHEN `goalId` IS", records
 * that two peer optionals cannot express that in the type, and says the
 * invariant is asserted in `e2e/goals.spec.ts` instead - which it is, in BOTH
 * directions (a row with a goal and no source, and a row with a source and no
 * goal). Every row reaching here came out of `goalContributions`, which selects
 * on `goalId`, so a missing source would be exactly the defect that spec exists
 * to catch. This is `BudgetDetailScreen`'s `transactionCategory(...)!` pattern:
 * a `!` over a documented invariant with a test behind it.
 *
 * FILTERING THE ROW OUT INSTEAD WAS THE ALTERNATIVE AND IS WORSE - it would
 * drop a defective row from the list AND from its count, hiding the defect
 * rather than surfacing it.
 * -----------------------------------------------------------------------------
 */
export function ContributionRow({ transaction }: { transaction: Transaction }) {
  return (
    <ChartLegendItem
      variant="contribution"
      hasIcon={false}
      title={contributionSourceLabel(transaction.contributionSource!)}
      subtitle={formatDayMonth(transaction.occurredAt.slice(0, 10))}
      amount={formatMyr(Math.abs(transaction.amount))}
    />
  )
}

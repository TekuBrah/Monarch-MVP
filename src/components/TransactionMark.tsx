import { Avatar, Logo } from '@monarch/design-system'
import type { TransactionLogo } from '../data/types'

/**
 * The leading visual on a ledger row — a merchant mark or a person.
 *
 * COMPOSITION, NOT A PRIMITIVE (rule 4). It defines nothing: it switches between
 * two DS components on the data's own tag and forwards a size. The reason it
 * exists as a component rather than a ternary repeated at each call site is that
 * there are now THREE call sites — the Homepage's two-row slice, the bank
 * drill-down's "Recent transactions", and Flow 8's ledger — and a fourth is
 * coming with Flow 9. A ternary copied four times is four places to update when
 * `TransactionLogo` grows a third case.
 *
 * IT OWNS NO STYLESHEET, so the "a component owns its CSS" rule has nothing to
 * carry here: both branches are DS components rendered at their own sizes, and
 * the MVP adds no rule of its own.
 *
 * THE SWITCH IS EXHAUSTIVE BY CONSTRUCTION. `TransactionLogo` is a discriminated
 * union, so adding a third `kind` makes this function fail to compile rather
 * than silently render nothing — which is the whole reason the data carries a
 * tag instead of two optional fields.
 */
export function TransactionMark({
  mark,
  size = 'm',
}: {
  mark: TransactionLogo
  /** The one ramp both `Logo` and `Avatar` share — verified against the pin. */
  size?: 's' | 'm' | 'l'
}) {
  if (mark.kind === 'person') {
    return <Avatar size={size} initials={mark.initials} />
  }
  return <Logo name={mark.name} size={size} />
}

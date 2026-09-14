import { Avatar, Logo } from '@monarch/design-system'
import { transactionLogoUrl } from '../config/media'
import type { TransactionLogo } from '../data/types'

/**
 * The leading visual on a ledger row — a curated merchant mark, a person, or a
 * photograph of the merchant itself.
 *
 * COMPOSITION, NOT A PRIMITIVE (rule 4). It defines nothing: it switches between
 * two DS components on the data's own tag, resolves one url, and forwards a
 * size. The reason it exists as a component rather than a ternary repeated at
 * each call site is that there are now SEVEN call sites — `HomepageFiat`,
 * `HoldingDetailScreen`, `TransactionsLedger`, `TransactionDetailSheet`,
 * `TransactionPicker`, `ReceiptCard` and `ReceiptViewer` — and Gate 53 is the
 * gate that collected on that: adding the third `kind` changed ONE file, not
 * seven.
 *
 * THE COUNT IN THIS PARAGRAPH READ "THREE ... and a fourth is coming with Flow
 * 9" FROM GATE 41 UNTIL GATE 53, by which point it was seven. Re-derive it
 * rather than trusting it — `grep -rn "<TransactionMark" src/` is the whole
 * check, and the number only ever grows.
 *
 * IT OWNS NO STYLESHEET, so the "a component owns its CSS" rule has nothing to
 * carry here: all three branches are DS components rendered at their own sizes,
 * and the MVP adds no rule of its own. The `image` case needed none either —
 * `.mn-avatar--photo img` already crops with `object-fit: cover` inside the
 * fixed circle `.mn-avatar` clips, which is verified at render in Gate 53's
 * report rather than read off the DS stylesheet.
 *
 * ───────────────── THE SWITCH IS EXHAUSTIVE BY CONSTRUCTION ──────────────────
 *
 * THERE IS NO `default` CASE AND THERE MUST NOT BE, because a default is
 * precisely what would let a fourth `kind` compile and render nothing. The two
 * early returns narrow `mark` down to the `merchant` member, so the final
 * `mark.name` is what fails to compile the day `TransactionLogo` grows a
 * fourth case — a type error at `npx tsc -b --force`, at this line, naming the
 * property that no longer exists on every member. That is the whole reason the
 * data carries a tag instead of a bag of optional fields.
 *
 * SO THE ORDER OF THESE RETURNS IS LOAD-BEARING, not stylistic: the case that
 * reads a member-specific property has to come LAST.
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
  if (mark.kind === 'image') {
    /*
      `alt=""` AND NOT THE MERCHANT NAME, DELIBERATELY — the same call
      `ReceiptCard` makes about its thumbnail. Every call site renders this mark
      immediately beside the merchant name as text, so a describing `alt` would
      make a screen reader announce that name twice.

      IT IS PASSED EXPLICITLY RATHER THAN OMITTED. `Avatar` falls back to
      `alt ?? name ?? ''`, so omitting it happens to produce the same empty
      string today — and "the default happens to agree" is exactly what bit this
      repo on `ListItem.hasReceiptIcon`, whose default is `true`. When the design
      says the thing is absent, pass the value.
    */
    return <Avatar size={size} src={transactionLogoUrl(mark.filename)} alt="" />
  }
  return <Logo name={mark.name} size={size} />
}

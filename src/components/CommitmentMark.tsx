import { Icon, IconObject, Logo } from '@monarch/design-system'

import type { Commitment } from '../data/types'

/**
 * A commitment's mark — a brand logo, or a tinted icon badge.
 *
 * PROMOTED FROM `PlansTab.tsx` AT GATE 80, which is exactly what that file's own
 * note said would happen: "a component crosses into the shared bucket when a
 * SECOND call site needs it. This has one. [The] commitment detail screen is the
 * second." It owns no stylesheet, so the standing "a component owns its
 * stylesheet" rule has nothing to carry across with it.
 *
 * A SWITCH ON THE TAG WITH NO `default`, so a third `CommitmentLogo` kind is a
 * compile error rather than a row that renders nothing. `TransactionMark`'s
 * construction, and the same reason it has no `default` either.
 *
 * THE TINT IS TRANSCRIBED PER ROW, NOT DERIVED FROM THE CATEGORY, and that was
 * settled by measurement. Deriving it from `TRANSACTION_CATEGORIES`' `hue` was
 * the tidier design and it is wrong: Figma paints Mortgage TEAL and Car Payment
 * GRAY, while their categories (`bills`, `transport`) map to RED and LIME — so
 * the rule contradicts the frame on both of the rows that existed to check it.
 * Golf Lesson, added at Gate 80, is a third counter-example: GREEN against
 * `others`' ORANGE. See `CommitmentLogo` in `types.ts`.
 */
export function CommitmentMark({
  commitment,
  size,
}: {
  commitment: Commitment
  /**
   * `'row'` is the Plans tab's list mark, unchanged from Gate 76 — Figma's
   * `Size=Xl` badge (a 32px glyph in 4px of padding = 40) and its `Size=XXL 40`
   * logo, which are the same 40px.
   *
   * `'hero'` is the commitment detail's centred mark, Figma's 56x56
   * `<element>` (`I1266:14343;882:8090`). `IconObject size="xxl"` and
   * `Logo size="l"` are both `--brand-scale-1200` = 56, so one name serves both
   * branches at both sizes and no call site writes a pixel.
   */
  size: 'row' | 'hero'
}) {
  const hero = size === 'hero'
  const { logo } = commitment

  switch (logo.kind) {
    case 'brand':
      return <Logo name={logo.name} size={hero ? 'l' : 'm'} />
    case 'icon':
      return (
        <IconObject color={logo.tint} size={hero ? 'xxl' : 'xl'} shape="circle">
          <Icon name={logo.name} size={hero ? 'l' : 'm'} />
        </IconObject>
      )
  }
}

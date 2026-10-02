import { Button, Divider, Icon, IconObject, Modal } from '@monarch/design-system'

/**
 * -----------------------------------------------------------------------------
 * FLOW 11 - THE SMART-INSIGHT EDUCATION PANEL, Figma `1266:14342` (Gate 80).
 *
 * A SECOND `Modal` STACKED OVER THE INSIGHT, NOT A SWAP. The frame draws TWO
 * `Modal` nodes: the insight panel is still there, behind a second `Blanket`.
 * That is why the screen holds two booleans rather than one `view` enum, and
 * why the walk state declares `opens: ['Smart insights']` with
 * `dialogs: ['Smart insights', 'Smart Savings Insights']` - the Gate 50-A split
 * for exactly this shape.
 *
 * ITS GEOMETRY IS A MODAL for the same reason the insight's is: the inner node
 * is named "Bottom Sheet" and sits at x=16, 343 wide, all corners rounded.
 *
 * ------------------------------- THE HERO -----------------------------------
 *
 * TEKU'S DECISION 1 = B, 1 OCTOBER 2026. Figma draws a 43x43 multi-colour spot
 * illustration - a yellow bulb with a blue sparkle - as a RAW FRAME, not a
 * component instance, and the DS ships no multi-colour illustration anywhere.
 * It does ship this exact MARK as `icon_aiinsights`, single-colour, and it
 * expresses "AI" with a blue-to-violet gradient on `IconObject color="ai"`.
 *
 * SO THE HERO IS THAT GLYPH IN THAT GRADIENT BADGE, AND NO GRADIENT IS WRITTEN
 * HERE. `color="ai"` paints `--brand-blue-400 -> --brand-blue-500 ->
 * --brand-violet-500` from the DS's own rule - the identical token sequence the
 * Steward FAB and the promotion banner use, which is the condition Teku set:
 * read from the DS, never hand-mixed, or the three AI surfaces drift.
 *
 * THE DIVERGENCE IS RECORDED RATHER THAN HIDDEN: a 40px gradient badge where
 * Figma draws a free-standing 43px yellow bulb. 43 is not a ramp step; `xxl` is
 * 56 and `xl` is 40, and 40 is the nearer.
 *
 * ------------------------------ THE CARD ------------------------------------
 *
 * The bordered list is MVP CSS, not a DS component: Figma's own node is a plain
 * frame named "Text area" with a 1px `border/subtlest/default`, 8px radius and
 * 12/16 padding - no component, no bindings beyond those three. The check and
 * cross badges ARE components: 16px `IconObject`s, square, on `Blue/400` and
 * `Red/400`, which are `color="blue"` and `color="red"` (the DS resolves both
 * to `--brand-<hue>-400`) at `size="xs"` (`--brand-scale-400` = 16). At xs the
 * DS's square radius is `--brand-scale-100` = 4, which is Figma's
 * `Border Radius/sm`.
 * -----------------------------------------------------------------------------
 */

/** What Monarch checks, and what it does not. Transcribed from `1266:14342`. */
const CHECKS = [
  'Current plan cost',
  'Payment frequency (monthly bills)',
  'Publicly available promotions',
]

const NEVERS = [
  'Change your plan automatically',
  'Share your personal data',
  'Contact providers on your behalf',
]

export function InsightEducationModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      isOpen
      onClose={onClose}
      /*
        NO HEADER TITLE, WHICH IS WHAT FIGMA DRAWS. `1266:14342` puts only the
        close control in the header row and the title BELOW the hero glyph, at
        `header/h6` (20/24) and centred - where the insight panel beside it does
        carry a header title. So the two modals differ, correctly.

        `ariaLabel` CARRIES THE ACCESSIBLE NAME INSTEAD. `Modal` wires
        `aria-labelledby` to its header heading when there is one and falls back
        to `aria-label`, which is also the order `readOpenDialogs` reads in the
        harness - so the walk state still names this dialog "Smart Savings
        Insights" with nothing in the header to read it from.
      */
      ariaLabel="Smart Savings Insights"
      className="mvp-education-modal"
      footer={
        <Button variant="primary" size="l" label="Got it" onClick={onClose} />
      }
    >
      <div className="mvp-education">
        <div className="mvp-education__hero">
          <IconObject color="ai" size="xl" shape="circle">
            <Icon name="icon_aiinsights" size="m" />
          </IconObject>
          {/*
            THE TITLE LIVES HERE, NOT IN THE HEADER - see the `ariaLabel` note
            above. `type-header-h6` is the `header/h6` Figma binds on the node.
          */}
          <p className="mvp-education__title type-header-h6">Smart Savings Insights</p>
          <p className="mvp-education__subtitle type-body-sm">
            How Monarch finds ways to save on bills
          </p>
        </div>

        <Divider />

        <div className="mvp-education__why">
          <p className="mvp-education__heading type-body-m-semibold">
            Why You’re seeing this alert
          </p>
          <p className="mvp-education__body type-body-sm">
            Monarch reviews your recurring bills to find potential ways you could save.
          </p>
        </div>

        <div className="mvp-education__card">
          <div className="mvp-education__group">
            <p className="mvp-education__group-label type-body-caption-medium">
              What Monarch Checks
            </p>
            <ul className="mvp-education__list">
              {CHECKS.map((item) => (
                <li key={item} className="mvp-education__item">
                  <IconObject color="blue" size="xs" shape="square">
                    <Icon name="check" size="xs" />
                  </IconObject>
                  <span className="type-body-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <Divider />

          <div className="mvp-education__group">
            <p className="mvp-education__group-label type-body-caption-medium">
              What Monarch does NOT do
            </p>
            <ul className="mvp-education__list">
              {NEVERS.map((item) => (
                <li key={item} className="mvp-education__item">
                  <IconObject color="red" size="xs" shape="square">
                    <Icon name="close" size="xs" />
                  </IconObject>
                  <span className="type-body-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mvp-education__footnote type-body-caption">
          Monarch suggests and you decide.
        </p>
      </div>
    </Modal>
  )
}

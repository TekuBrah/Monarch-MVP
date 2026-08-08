import { Divider } from '@monarch/design-system'

/**
 * The label/value rows on a holding's drill-down.
 *
 * ⚠️ THE SCREEN HAS TWO DETAIL-ROW IDIOMS, NOT ONE. Figma's fixed-deposit screen
 * draws four `card/data display` tiles AND three plain label/value rows, and the
 * drill-down template carries both because that is what the source draws. The
 * tiles are the DS `CardDataDisplay`; these rows are not a component in Figma at
 * all.
 *
 * WHY THIS IS A COMPOSITION AND NOT A RULE-3 GAP. `ListItem` was the obvious
 * candidate and was rejected on inspection: it is a leading-slot / title /
 * title-info / amount / amount-info row built for ledger entries, and driving it
 * with a bare label and value would leave four of its six slots empty while
 * still paying for its interaction affordances. What Figma draws here is a
 * two-column definition list with rules between the rows — genuinely a layout,
 * which is what rule 4 is for. The one part of it that IS a primitive, the rule
 * itself, is the DS `Divider`.
 *
 * Rendered as a `<dl>` because that is what it is: terms and their definitions.
 */
export interface DetailRow {
  label: string
  value: string
}

export function DetailRows({ rows }: { rows: DetailRow[] }) {
  return (
    <dl className="mvp-finance__rows">
      {rows.map((row, index) => (
        <div key={row.label} className="mvp-finance__row-group">
          {index > 0 && <Divider weight={1} />}
          <div className="mvp-finance__row">
            <dt className="type-body-sm mvp-finance__row-label">{row.label}</dt>
            <dd className="type-body-sm-semibold mvp-finance__row-value">{row.value}</dd>
          </div>
        </div>
      ))}
    </dl>
  )
}

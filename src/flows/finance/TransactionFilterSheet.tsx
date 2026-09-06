import { useMemo, useState } from 'react'
import {
  Button,
  Icon,
  Menu,
  MenuItem,
  RangeSlider,
  Select,
  Sheet,
  ToggleChip,
} from '@monarch/design-system'
import {
  TRANSACTION_AMOUNT_CEILING,
  TRANSACTION_AMOUNT_FLOOR,
  TRANSACTION_DATE_RANGES,
  TRANSACTION_FILTER_ALL,
  TRANSACTION_METHODS,
  filterTransactions,
  transactionPayees,
} from '../../data/derive'
import type { TransactionFilter } from '../../data/derive'
import type { Transaction, TransactionMethod } from '../../data/types'

/**
 * The Transactions filter sheet — Figma `Finance_Transaction02` (`1266:14329`),
 * whose sheet is the child frame `I1266:14329;825:6146` (scrim + panel), with
 * the panel itself at `I1266:14329;825:6148`.
 *
 * COMPOSITION, NOT A PRIMITIVE (rule 4). Every control here is a DS export —
 * `Sheet`, `ToggleChip`, `Select`, `Menu`/`MenuItem`, `RangeSlider`, `Button`.
 * This file arranges them and owns no appearance that the DS could own; its
 * stylesheet is layout rules in `finance.css`.
 *
 * THE PENDING FILTER IS A COPY, AND THE SCREEN'S FILTER IS STILL THE ONLY
 * STATE. Editing a chip must not re-filter the list behind the scrim — the
 * whole point of an Apply button is that the change is not in force until it
 * is pressed. So this holds a `pending` copy and hands it back through
 * `onApply` exactly once. The copy is seeded from the applied value and is
 * DISCARDED on close, which is why `TransactionsLedger` mounts this component
 * conditionally rather than keeping it mounted and hidden: a fresh mount is
 * what guarantees the seed is current, with no effect to keep in step.
 *
 * FACET ORDER IS FIGMA'S SHEET ORDER — Date Range, Transaction Type,
 * Transaction Merchant, Transaction Amount. It deliberately DIFFERS from the
 * applied-chip row's order (type, date, payee, amount), which was left
 * untidied at Gate 41-B. Do not "fix" either one into the other; they are two
 * surfaces with two source orders, and both are as drawn.
 */
export interface TransactionFilterSheetProps {
  transactions: Transaction[]
  /** The filter currently IN FORCE — what the pending copy is seeded from. */
  filter: TransactionFilter
  /**
   * The live search box.
   *
   * IT IS AN INPUT TO THE COUNT, NOT TO THE FILTER. See `matchCount` below —
   * the button promises a number of rows, and the search stays in force when
   * the sheet closes, so a count that ignored it would be a promise the
   * ledger then breaks.
   */
  search: string
  onApply: (filter: TransactionFilter) => void
  onClose: () => void
}

/**
 * WHICH SCREEN THE ONE SHEET IS SHOWING — an IN-PLACE PUSH, not a second sheet.
 *
 * A STACKED SHEET WAS REJECTED. Opening a second `Sheet` over the first gives
 * the user two scrims, two panels and two dismiss gestures for one task, and
 * leaves Escape ambiguous — does it close the picker or the whole filter? The
 * push keeps ONE overlay, ONE scrim and ONE dismiss gesture, and the DS's own
 * `Sheet` suite asserts this structure. Inline expansion (the list growing
 * inside the filters body) and a horizontal `ToggleChip` row were rejected
 * too: 19 options do not fit either shape at 375.
 */
type SheetView = 'filters' | 'merchant'

/**
 * THE CHECKBOX IS A GLYPH, NEVER AN `<input type="checkbox">`.
 *
 * `MenuItem` renders `role="option"` with `aria-selected={isSelected}`
 * (`MenuItem.tsx:74-75`) inside `Menu`'s `role="listbox"` (`Menu.tsx:125`). An
 * interactive input nested inside a non-interactive `option` is ARIA-invalid,
 * would take focus away from the roving-tabindex the listbox manages, and
 * would give the row TWO selection states that can disagree — the input's
 * `checked` and the option's `aria-selected`. The glyph is driven by the same
 * `isSelected` the row announces, so there is exactly one source of truth and
 * the picture cannot drift from what a screen reader is told.
 *
 * THE DS SET THIS PRECEDENT ITSELF. `MenuItem`'s own `type="radio"` branch
 * draws a presentational dot and comments it: *"Presentational — the row
 * (role="option") owns selection semantics, not this dot."* This is that
 * pattern with a box instead of a dot, supplied through the free `iconSlot`
 * rather than added to the component.
 *
 * BOTH GLYPHS ARE SHIPPED DS ASSETS — `check_box` and
 * `check_box_outline_blank`, verified present in the sibling source
 * (`Icon/icons.ts:193-194`) AND in the pinned dist typings, because the Vite
 * alias compiles the first and `tsc` reads the second. No near-miss
 * substitution and no MVP-drawn box.
 */
function boxGlyph(isSelected: boolean): 'check_box' | 'check_box_outline_blank' {
  return isSelected ? 'check_box' : 'check_box_outline_blank'
}

export function TransactionFilterSheet({
  transactions,
  filter,
  search,
  onApply,
  onClose,
}: TransactionFilterSheetProps) {
  const [pending, setPending] = useState<TransactionFilter>(filter)
  const [view, setView] = useState<SheetView>('filters')

  const isMerchantView = view === 'merchant'

  /**
   * The Merchant facet's options — 18 distinct names, DERIVED.
   *
   * `transactionPayees` de-duplicates and sorts the ledger's `merchant` field.
   * It is never a literal list and never a grep: a naive single-quote regex
   * over the source returns 16, because two rows are DOUBLE-quoted to carry
   * the apostrophes in their names. Note that 16 is a COINCIDENCE and not the
   * merchant/person split — 16 rows also carry `logo.kind === 'merchant'`, but
   * they are a DIFFERENT set of 16. The count is 18 and it comes from the data.
   */
  const payees = useMemo(() => transactionPayees(transactions), [transactions])

  /**
   * WHAT THE APPLY BUTTON COUNTS — the rows the PENDING filter matches.
   *
   * Confirmed against the live Figma read: the frame prints "Apply Filter
   * (15)", and `TRANSACTION_FILTER_APPLIED` over the 23-row ledger returns
   * exactly 15. So N is a row count, not a count of facets changed or options
   * selected — either of those would print 2 and 4 respectively on that frame.
   *
   * IT INCLUDES THE SEARCH TERM, WHICH FIGMA CANNOT ADJUDICATE because the
   * mockup's search box is empty, so both readings print 15 there. Including
   * it is the reading that keeps the number honest: the search box is still in
   * force after the sheet closes, so `filterTransactions(...)` here is
   * literally the same call the ledger makes, and N is therefore the number of
   * rows the user will actually see.
   */
  const matchCount = useMemo(
    () => filterTransactions(transactions, pending, search).length,
    [transactions, pending, search],
  )

  /**
   * THE NUMBER IS UNCHANGED. THE WORDS AROUND IT ARE NOT — Gate 44.
   *
   * `Apply Filter (23)` reads as "23 filters", or as a version number, or as
   * anything but what it is. That was a COPY defect rather than a semantic one:
   * the count above is right, matches Figma's own frame, and was deliberately
   * not touched. Naming the unit is the whole fix.
   *
   * THIS IS A DELIBERATE DIVERGENCE FROM FIGMA AND IT IS COPY-LEVEL ONLY.
   * Figma prints `Apply Filter (15)`; this prints `Apply Filter · 15 results`
   * for the same filter over the same ledger. Registered as such — the number
   * the two produce is identical, so nothing about the model diverges.
   *
   * SINGULAR AND ZERO ARE HANDLED RATHER THAN LEFT TO THE COMMON CASE.
   * "1 results" is the classic tell of a count pasted into a fixed string, and
   * "0 results" is worse than useless on a button the user is about to press —
   * "No results" says the same thing as a warning instead of as arithmetic.
   * Applying a filter that matches nothing is still a legal act, so the button
   * stays enabled and simply says so.
   */
  const applyLabel =
    matchCount === 0
      ? 'Apply Filter · No results'
      : `Apply Filter · ${matchCount} ${matchCount === 1 ? 'result' : 'results'}`

  /**
   * `null` is ABSENT, NOT EMPTY — the distinction `TransactionFilter`'s own
   * doc-comment draws. Deselecting the last member of a list facet therefore
   * returns to `null` ("All") rather than to `[]`, which would mean "match
   * nothing" and is unreachable through this UI by design.
   *
   * The reset value is READ OUT OF `TRANSACTION_FILTER_ALL` rather than
   * written as a literal `null`, so this cannot drift from what `clearFacet`
   * and the Reset action produce.
   */
  function toggleIn<T>(list: T[] | null, value: T, cleared: T[] | null): T[] | null {
    const next =
      list === null
        ? [value]
        : list.includes(value)
          ? list.filter((v) => v !== value)
          : [...list, value]
    return next.length === 0 ? cleared : next
  }

  /**
   * THE RESTING TRIGGER IS COMMA-JOINED TEXT, NOT TAGS.
   *
   * Joined with ", " in the SOURCE ORDER of the `payees` array — the order the
   * user tapped them in, not re-sorted — so the trigger reads back the act
   * rather than a normalised set.
   *
   * NOTHING SELECTED RENDERS THE EMPTY STRING, which lets `Select`'s own
   * `placeholder` show through unchanged. That placeholder is "All merchants"
   * and is the same string the picker's clear row carries, so the trigger and
   * the list agree on what "no filter" is called.
   *
   * TAGS WERE REJECTED, AND NOT ON FEASIBILITY. `SelectProps.value` is
   * `value?: string` — a string, not a node — so tags are unavailable anyway;
   * but the deciding reason is that the applied-chip row OUTSIDE the sheet
   * already renders these same payees as dismissible tags. Drawing them again
   * inside a 343px trigger would show one thing in two shapes, and the two
   * would differ in what a tap on them does. No count badge either: a badge
   * names how many without naming which, on a control whose whole job is to
   * say which.
   */
  const merchantValue = pending.payees === null ? '' : pending.payees.join(', ')

  /**
   * THE MERCHANT FACET IS GENUINELY MULTI-SELECT, AND THE PICKER STAYS OPEN.
   *
   * TAPPING TOGGLES; IT DOES NOT COMMIT AND LEAVE. An earlier revision of this
   * file returned to the filters view on every tap, which was written on the
   * assumption that the facet was single-select. It is not — `payees` is
   * `string[] | null` and the applied-chip row already joins several names —
   * so returning on tap made selecting a second merchant cost a full round
   * trip through the trigger. Ruled multi-select; the return-immediately
   * behaviour is DELIBERATELY REVISED here, not in conflict with anything.
   *
   * THE BACK ARROW IS THE COMMIT-AND-RETURN GESTURE, and it is the only one.
   * Nothing is committed to the applied filter by it either — `pending` is
   * still a draft until Apply. "Commit" here means only "stop editing this
   * facet".
   *
   * THE SCRIM AND ESCAPE ARE UNCHANGED AND MUST STAY THAT WAY. Both close the
   * WHOLE sheet and discard the pending draft, exactly as they did before the
   * picker existed. Making the scrim mean "return to filters" would give one
   * dialog two dismiss gestures with two different meanings, which is the
   * ambiguity the in-place push exists to avoid.
   */
  function toggleMerchant(payee: string) {
    setPending((f) => ({
      ...f,
      payees: toggleIn(f.payees, payee, TRANSACTION_FILTER_ALL.payees),
    }))
  }

  /**
   * "All merchants" CLEARS EVERY SELECTION AND ALSO STAYS OPEN — it is a
   * clear, not a nineteenth merchant, and not a dismissal.
   *
   * The cleared value is READ OUT OF `TRANSACTION_FILTER_ALL` rather than
   * written as a literal `null`, so it cannot drift from what Reset and a
   * dismissed chip produce. `null` is ABSENT, not EMPTY — `[]` would mean
   * "match nothing" and is unreachable through this UI by design.
   */
  function clearMerchants() {
    setPending((f) => ({ ...f, payees: TRANSACTION_FILTER_ALL.payees }))
  }

  return (
    <Sheet
      isOpen
      onClose={onClose}
      /*
        HEIGHT, NOT WIDTH — `Sheet.sizing` is the one `sizing` prop in the DS
        whose axis is vertical, and its values are `'hug' | 'fill'` where
        `Select.sizing` is `'fixed' | 'fill'`. That divergence is a shipped DS
        ruling, read from the `.d.ts` rather than assumed to match: Sheet's
        default really is hug-height, so `'fixed'` would name behaviour it does
        not have.

        The picker opens AT the panel's existing max-height cap so a 19-row
        list has somewhere to scroll, and the filters view keeps the default
        hug so the sheet RETURNS TO ITS NATURAL HEIGHT on the way back. No new
        geometry either way: `'fill'` takes the cap the panel already declares.
      */
      sizing={isMerchantView ? 'fill' : 'hug'}
      title={isMerchantView ? 'Select merchant' : 'Filter transactions'}
      /*
        NO ✕, BECAUSE FIGMA DRAWS NONE. The header is title-left and "Reset"-
        right and nothing else. Dismissal is still fully available — `Sheet`
        supplies Escape and a scrim click unconditionally — so suppressing the
        button removes a control the mockup does not have without removing the
        ability to close. In the merchant view the back arrow is additionally
        the dismissal affordance `showCloseButton`'s own doc-comment names.
      */
      showCloseButton={false}
      headerIconLeft={
        isMerchantView ? (
          /*
            A BARE <button> WITH AN `aria-label`, NOT A DS `Button`.
            `ButtonProps` exposes `label`, `leadingIcon` and `trailingIcon` but
            NO `ariaLabel` and no `className` — so an icon-only DS Button would
            render with no accessible name at all. This is the same composition
            the filter trigger in `TransactionsLedger` already uses for exactly
            that reason, and it is a real focusable control rather than a
            clickable div.
          */
          <button
            type="button"
            className="mvp-txn-filter__back"
            aria-label="Back to filters"
            onClick={() => setView('filters')}
          >
            <Icon name="arrow_back" size="m" />
          </button>
        ) : undefined
      }
      headerAction={
        isMerchantView ? undefined : (
          /*
            Figma paints "Reset" as plain blue text, which is `--btn-text` on
            `.mn-btn--tertiary`. A `Link` would render the same colour and be
            wrong: this performs an action on the current page, it does not
            navigate, and the DS's own `Sheet` header trail is where a Button
            belongs.

            RESET WRITES THE PENDING COPY, NOT THE APPLIED FILTER. Figma gives
            the sheet one primary action; making Reset apply immediately would
            give it two, and would make "Reset then close" a destructive act the
            user never confirmed.

            THE BACK ARROW REPLACES IT IN THE MERCHANT VIEW. Reset clears all
            four facets, which is not an act the picker is about — leaving it
            there would put a whole-form control on a single-facet screen.
          */
          <Button
            variant="tertiary"
            size="s"
            label="Reset"
            onClick={() => setPending(TRANSACTION_FILTER_ALL)}
          />
        )
      }
      /*
        NO APPLY IN THE PICKER. The action region belongs to the filters view;
        a pinned "Apply Filter · N results" under a merchant list would let the
        user commit from a screen that is not showing them what they are
        committing. Selecting returns immediately, so Apply is always one step
        away and never skipped.
      */
      actions={
        isMerchantView ? undefined : (
          <Button
            variant="primary"
            label={applyLabel}
            trailingIcon={<Icon name="tune" size="m" />}
            onClick={() => {
              onApply(pending)
              onClose()
            }}
          />
        )
      }
    >
      {isMerchantView ? (
        /*
          COMPOSED FROM `Menu` + `MenuItem`. No new component — there is no
          merchant-picker component in Figma to reproduce (settled at Gate 45,
          after an earlier thread inferred one from a screenshot), so this is
          the DS's own option-list primitive arranged by the consumer.

          `--menu-width` IS THE DS'S OWN OVERRIDE SEAM, not a gap and not an
          override of DS geometry. `.mn-menu` declares
          `width: var(--menu-width, 426px)` and its comment names the custom
          property as the caller's control. 426 is wider than the 375 panel, so
          the default would overflow; taking the seam is using the component as
          designed. Contrast G15, where `.mn-select`'s hard `width: 320px` had
          NO seam at all until `sizing` shipped.
        */
        <div className="mvp-txn-filter__merchants">
          <Menu
            searchBar={false}
            listAriaLabel="Select merchant"
            slotContent={
              <>
                {/*
                  "All merchants" SITS AT THE TOP, and it is the CLEAR option
                  rather than a nineteenth merchant. Top because a clear action
                  the user is looking for should not be at the end of a list
                  they have to scroll; `isSelected` when the facet is at its
                  default, so the picker states the current value rather than
                  showing nothing selected.

                  IT CARRIES A BOX LIKE EVERY OTHER ROW, deliberately. When
                  nothing is selected, "All merchants" IS what is in force, so
                  a checked box there is the truth rather than a decoration —
                  and a single boxless row in a column of nineteen reads as a
                  rendering fault rather than as a different kind of control.
                */}
                <MenuItem
                  label="All merchants"
                  isSelected={pending.payees === null}
                  iconSlot={<Icon name={boxGlyph(pending.payees === null)} size="m" />}
                  onSelect={clearMerchants}
                />
                {payees.map((payee) => {
                  const isPicked = pending.payees?.includes(payee) ?? false
                  return (
                    <MenuItem
                      key={payee}
                      label={payee}
                      isSelected={isPicked}
                      iconSlot={<Icon name={boxGlyph(isPicked)} size="m" />}
                      onSelect={() => toggleMerchant(payee)}
                    />
                  )
                })}
              </>
            }
          />
        </div>
      ) : (
        <div className="mvp-txn-filter">
          {/*
            A `fieldset` PER FACET, because each is a named group of controls and
            that is what the element is for. The chips are `aria-pressed`
            buttons (the DS's own `ToggleChip` markup), so a `legend` is what
            gives the group its accessible name — a bare `<p>` label would leave
            four unlabelled chip rows.
          */}
          <fieldset className="mvp-txn-filter__group">
            <legend className="mvp-txn-filter__legend type-body-caption-semibold">
              Date Range
            </legend>
            {/*
              BUILT FROM `TRANSACTION_DATE_RANGES` (4), NOT FROM FIGMA'S FOUR.
              The counts match and the MEMBERS do not — Figma draws "This Month",
              "last 7 days", "Last 30 days" and "Custom Range"; the data offers
              "All Time", "This Month", "Last 7 Days" and "Last 30 Days". Figma's
              "Custom Range" is not expressible by `TransactionDateRangeId` and
              would be a dead chip, and Figma omits "All Time", which is the
              cleared state the Reset action and every dismissed chip produce.
              Registered as a mockup/data mismatch; built from the data.
            */}
            <div className="mvp-txn-filter__chips">
              {TRANSACTION_DATE_RANGES.map((range) => (
                <ToggleChip
                  key={range.id}
                  label={range.label}
                  isSelected={pending.dateRange === range.id}
                  onClick={() =>
                    setPending((f) => ({ ...f, dateRange: range.id }))
                  }
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="mvp-txn-filter__group">
            <legend className="mvp-txn-filter__legend type-body-caption-semibold">
              Transaction Type
            </legend>
            {/*
              BUILT FROM `TRANSACTION_METHODS` (3, plus All), AGAINST FIGMA'S 5.
              Figma draws All / Food / Bills / Utilities / Transfers, which is
              neither the method union ('Card Payment' | 'Fund Transfer' |
              'Crypto Transfer') nor the category table (whose seven labels
              include "Bills & Utilities" as ONE member, where Figma splits
              "Bills" and "Utilities" into two). The filter model's type facet is
              `methods`; four of Figma's five chips cannot be produced by it, so
              offering them would be four dead filters. Registered; built from
              the data.
            */}
            <div className="mvp-txn-filter__chips">
              <ToggleChip
                label="All"
                isSelected={pending.methods === null}
                onClick={() =>
                  setPending((f) => ({ ...f, methods: TRANSACTION_FILTER_ALL.methods }))
                }
              />
              {TRANSACTION_METHODS.map((method: TransactionMethod) => (
                <ToggleChip
                  key={method}
                  label={method}
                  isSelected={pending.methods?.includes(method) ?? false}
                  onClick={() =>
                    setPending((f) => ({
                      ...f,
                      methods: toggleIn(f.methods, method, TRANSACTION_FILTER_ALL.methods),
                    }))
                  }
                />
              ))}
            </div>
          </fieldset>

          <div className="mvp-txn-filter__group">
            <span
              className="mvp-txn-filter__legend type-body-caption-semibold"
              id="mvp-txn-filter-merchant"
            >
              Transaction Merchant
            </span>
            {/*
              G15 IS CLOSED ON THE CONSUMER SIDE — `sizing="fill"`, DS v2.1.0.
              `.mn-select` used to declare a hard `width: 320px` whose comment
              called it "caller-controllable" while `SelectProps` exposed
              neither a `sizing` prop nor a `className`, so the control rendered
              320 wide in a 343 column, 23px short, at BOTH viewports. The DS
              now ships the prop and `.mn-select--fill { width: 100% }`. No
              MVP-local `.mn-select { width: 100% }` was ever written and none
              is written now — that is the equal-specificity override on DS
              geometry Gate 13 removed on measurement.

              THE VALUES ARE `'fixed' | 'fill'`, NOT `'hug' | 'fill'`. Read from
              `Select.d.ts`, not assumed to match `Sheet.sizing` directly above
              — the DS diverges the two deliberately, because Select's default
              is a literal 320px box where Sheet's is genuinely hug-height.

              G16 IS CLOSED TOO — the `storefront` glyph shipped in the same
              release and now fills the trigger's leading slot, which Figma
              draws and which was previously left EMPTY rather than filled with
              a near-miss. Confirmed present in the shipped registry (103
              entries) rather than assumed from the release note.

              THE TRIGGER PUSHES; IT DOES NOT DROP DOWN. `isOpen` is pinned
              false and `onOpenChange` is intercepted, so both the field and the
              chevron request "open" and get the merchant view instead. No
              `menuSlot` is passed at all, so the inline dropdown — which would
              be a 19-row menu hanging out of a hug-height sheet — cannot
              render. `Select` still reports `aria-expanded="false"`, which is
              honest about the inline menu and imprecise about the push; the DS
              exposes no "acts as a navigation trigger" mode, so this is
              reported rather than worked around.

              `searchable={false}` — Figma draws a static value with a chevron,
              not a text cursor. The input stays readOnly and the control
              behaves as a dropdown trigger, which is what is drawn.
            */}
            <Select
              sizing="fill"
              searchable={false}
              value={merchantValue}
              placeholder="All merchants"
              ariaLabel="Transaction Merchant"
              isSelected={pending.payees !== null}
              leadingSlot={<Icon name="storefront" size="m" />}
              isOpen={false}
              onOpenChange={(open) => {
                if (open) setView('merchant')
              }}
            />
          </div>

          <div className="mvp-txn-filter__group">
            {/*
              THE CURRENCY MARK IS FIGMA'S, on the label row's right edge
              (`I1266:14329;830:6008`, the text "RM"). It is a unit annotation on
              the group, not a control, so it is a `<span>` beside the label
              rather than anything focusable.
            */}
            <div className="mvp-txn-filter__legend-row">
              <span className="mvp-txn-filter__legend type-body-caption-semibold">
                Transaction Amount
              </span>
              <span className="mvp-txn-filter__unit type-body-caption-semibold">RM</span>
            </div>
            {/*
              ONE FACET, TWO FIELDS. `amountMin` and `amountMax` move together —
              `RangeSlider` reports both on every change — which is what keeps
              "clear the amount facet" a single act. Half a restored range is not
              a cleared facet, and `TransactionFacet` folds them into one member
              for the same reason.

              THE BOUNDS ARE MAGNITUDES. `filterTransactions` compares
              `Math.abs(amount)`, so this one control governs credits and debits
              alike; `txn-maybank-0907` (+RM 1,500) is the row that proves it —
              it is a CREDIT excluded by the cap.
            */}
            <RangeSlider
              minValue={pending.amountMin}
              maxValue={pending.amountMax}
              min={TRANSACTION_AMOUNT_FLOOR}
              max={TRANSACTION_AMOUNT_CEILING}
              formatValue={(value) => `RM ${value}`}
              showInputs
              ariaLabelMin="Minimum amount"
              ariaLabelMax="Maximum amount"
              onChange={(amountMin, amountMax) =>
                setPending((f) => ({ ...f, amountMin, amountMax }))
              }
            />
          </div>
        </div>
      )}
    </Sheet>
  )
}

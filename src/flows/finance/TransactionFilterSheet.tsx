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
 * stylesheet is four layout rules in `finance.css`.
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

export function TransactionFilterSheet({
  transactions,
  filter,
  search,
  onApply,
  onClose,
}: TransactionFilterSheetProps) {
  const [pending, setPending] = useState<TransactionFilter>(filter)
  const [isMerchantOpen, setIsMerchantOpen] = useState(false)

  /**
   * The Merchant facet's options — 18 distinct names, DERIVED.
   *
   * `transactionPayees` de-duplicates and sorts the ledger's `merchant` field.
   * It is never a literal list and never a grep: a naive single-quote regex
   * over the source returns 16, because it breaks on the apostrophes in
   * "Lotus's" and "Tony Roma's". The count is 18 and it comes from the data.
   */
  const payees = useMemo(() => transactionPayees(transactions), [transactions])

  /**
   * WHAT "Apply Filter (N)" COUNTS — the rows the PENDING filter matches.
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
   *
   * SHORT ENOUGH NOT TO WRAP AT 375, measured rather than eyeballed: the
   * longest form this can produce over the 23-row ledger renders on one line
   * inside the sheet's action row at both viewports.
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

  const merchantValue = pending.payees === null ? '' : pending.payees.join(', ')

  return (
    <Sheet
      isOpen
      onClose={onClose}
      title="Filter transactions"
      /*
        NO ✕, BECAUSE FIGMA DRAWS NONE. The header is title-left and "Reset"-
        right and nothing else. Dismissal is still fully available — `Sheet`
        supplies Escape and a scrim click unconditionally — so suppressing the
        button removes a control the mockup does not have without removing the
        ability to close.
      */
      showCloseButton={false}
      headerAction={
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
        */
        <Button
          variant="tertiary"
          size="s"
          label="Reset"
          onClick={() => setPending(TRANSACTION_FILTER_ALL)}
        />
      }
      actions={
        <Button
          variant="primary"
          label={applyLabel}
          trailingIcon={<Icon name="tune" size="m" />}
          onClick={() => {
            onApply(pending)
            onClose()
          }}
        />
      }
    >
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
            THE SELECT RENDERS 320px WIDE IN A 343px COLUMN, AND THAT IS A DS
            GAP (G15), NOT AN OVERSIGHT HERE. `.mn-select` declares a hard
            `width: 320px` whose comment calls it "caller-controllable", and
            `SelectProps` exposes neither a `sizing` prop nor a `className`, so
            there is no mechanism to control it with. An MVP-local
            `.mn-select { width: 100% }` is exactly the equal-specificity
            override on DS geometry that Gate 13 removed and that the search
            Field's own note above forbids, so none is written. Shipped at DS
            geometry and registered — the same disposition B2 (the 240px Field)
            had before DS v2.0.0 closed it.

            NO LEADING GLYPH, THOUGH FIGMA DRAWS ONE. The mockup puts a
            storefront mark in the trigger; the DS's 101-icon registry has no
            `storefront` or `store`, and filling the slot with an unrelated
            glyph would be substituting a control the mockup draws differently.
            Left empty and registered (G16).

            `searchable={false}` — Figma draws a static value with a chevron,
            not a text cursor. The input stays readOnly and the control behaves
            as a dropdown trigger, which is what is drawn.
          */}
          <Select
            searchable={false}
            value={merchantValue}
            placeholder="All merchants"
            ariaLabel="Transaction Merchant"
            isSelected={pending.payees !== null}
            isOpen={isMerchantOpen}
            onOpenChange={setIsMerchantOpen}
            menuSlot={
              <Menu
                searchBar={false}
                listAriaLabel="Transaction Merchant"
                slotContent={payees.map((payee) => (
                  <MenuItem
                    key={payee}
                    label={payee}
                    isSelected={pending.payees?.includes(payee) ?? false}
                    onSelect={() =>
                      setPending((f) => ({
                        ...f,
                        payees: toggleIn(f.payees, payee, TRANSACTION_FILTER_ALL.payees),
                      }))
                    }
                  />
                ))}
              />
            }
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
    </Sheet>
  )
}

import type { ChartHue, IconName, IconObjectColor, LogoName } from '@monarch/design-system'

/**
 * The MVP domain model.
 *
 * Grown one flow at a time, deliberately. Phase 5.3 Flow 1 (Homepage) seeds
 * exactly what the two Homepage screens render, plus the transactions ->
 * category-totals chain that the inventory's §6d proved already computes.
 * Later flows extend this file; nothing here is speculative.
 *
 * Two hard constraints, both from the flow inventory:
 *
 * 1. NO COLOUR LITERAL MAY REACH THIS FOLDER (architecture §3.4). Identity is
 *    carried by a DS component — `LogoName` for merchant/token marks,
 *    `IconName` for glyphs, `IconObjectColor` for badge tints — or by a token
 *    NAME as a string. Never a hex value.
 * 2. DERIVE, DON'T COPY (inventory §6). Every total, percentage and delta is a
 *    function of the amounts below, computed in `derive.ts`. A figure that is
 *    computable from another figure is not stored here. Where the Figma file
 *    disagrees with its own arithmetic, deriving is what exposes it.
 */

/** ISO 4217. Only MYR occurs in the file; typed so a second currency is additive. */
export type CurrencyCode = 'MYR'

// ---------------------------------------------------------------- money

/**
 * Every monetary amount in this model is a NUMBER, never a formatted string.
 * Outflows are negative. Formatting lives in `format.ts` so that one rule —
 * grouping, decimals, sign placement — applies everywhere, which is the fix
 * for the inventory's F9 A1 ("- RM 250.75.00") and F11 A6 formatter defects.
 */
export type Amount = number

// ---------------------------------------------------------------- fiat

export interface FiatAccount {
  id: string
  /** Figma: the caption above the name — "Account". */
  group: string
  /** Figma: "Main". */
  name: string
  /** DS `Logo` name; the Homepage renders the MYR flag. */
  logo: LogoName
  currency: CurrencyCode
  /**
   * AUTHORITATIVE (inventory §6a): RM 27,978.59. This is a stored source value,
   * not a derived one — the transaction ledger below is a partial slice of
   * history, so it cannot reconstruct a balance and must not be asked to.
   */
  balance: Amount
}

// ---------------------------------------------------------- transactions

/**
 * Spending categories. Homepage renders no category chip itself, but the
 * category is what makes the §6d chain real: transactions roll up to category
 * totals, which the Budget and Assistant flows read. Seeded with the two the
 * Homepage's own rows belong to plus the rest of F10's set, since the roll-up
 * is only meaningful against a closed set.
 */
export type TransactionCategoryId =
  | 'bills'
  | 'groceries'
  | 'dining'
  | 'healthcare'
  | 'transport'
  | 'shopping'
  | 'others'

export interface TransactionCategory {
  id: TransactionCategoryId
  label: string
  /** DS `Icon` name — the category's identity, not a colour. */
  icon: IconName
  /**
   * The category's SERIES colour — one hue shared by its budget-donut segment
   * and its legend badge (F7). A DS colour NAME, never a value.
   *
   * GATE 69. Read from Figma `1266:14337`'s legend: each `list/chart legend`
   * badge binds `<Hue>/400`. DS `DonutChart` and `IconObject` both resolve a hue
   * name to `--brand-<hue>-400`, so the segment and the badge are one token by
   * construction. (Figma's FLATTENED donut paints its wedges `<Hue>/500`; the DS
   * chose the badge step for both, and the legend is the sourced half.)
   */
  hue: ChartHue
}

// ---------------------------------------------------------------- budgets

/**
 * A spending budget — Flow 10, Decision 2A (Gate 67).
 *
 * A NAME, A LIMIT, A DATE RANGE AND ONE OR MORE CATEGORIES, AND NOTHING ELSE.
 * Spent, available and "left to spend" are derived from this and the ledger in
 * `derive.ts`; storing any of them would be a second copy of a fact the
 * transactions already state (§6).
 *
 * NP1: EVERY FIELD IS PLAIN SERIALISABLE DATA — strings, a number, a boolean and
 * a string array. No `Date`, no function, no class instance, so the persistence
 * that arrives after all flows is a storage adapter rather than a rewrite.
 */
export interface Budget {
  id: string
  /** The card's title — "Monthly Budget", "Entertainment". */
  name: string
  /** Non-empty by type. An outflow counts when its category is listed here. */
  categories: [TransactionCategoryId, ...TransactionCategoryId[]]
  /** The ledger's `Amount`: positive, in MYR. */
  limit: Amount
  /**
   * `'YYYY-MM-DD'`, inclusive at both ends. Dates the user TYPED, so they are
   * exempt from B5 (see `today.ts`), and they are compared as STRINGS against
   * the first 10 characters of `occurredAt`: a zone-less timestamp turned into a
   * `Date` would bring the device's timezone into the answer.
   */
  from: string
  to: string
  autoRenew: boolean
}

/**
 * How a row is paid — inventory §D3's three kinds, verbatim.
 *
 * Narrowed from a free `string` by Flow 8, because the Transactions filter has a
 * Type facet and a facet over an open string cannot be exhaustive: the chip list
 * would either be hand-maintained beside the data (two places to update) or
 * derived from whatever happens to be present (a facet that silently loses an
 * option when the last row using it is deleted). The three values ARE the
 * display strings, which is what the ledger already rendered — `titleInfo` takes
 * `method` unmodified at both pre-existing call sites, so no lookup table is
 * needed and none was added.
 */
export type TransactionMethod = 'Card Payment' | 'Fund Transfer' | 'Crypto Transfer'

/**
 * WHAT THE MOVEMENT IS, as opposed to how it was paid (Flow 11, Gate 75).
 *
 * A `payment` leaves the user's money; a `transfer` moves it between things the
 * user owns, or between the user and a person. Budgets count payments only —
 * `countsToward` in `derive.ts` reads this field and nothing else about movement.
 *
 * IT IS REQUIRED, NOT OPTIONAL, AND THAT IS THE WHOLE POINT. An optional field
 * lets a future row omit it and silently count toward a budget, which is the
 * exact defect this field exists to prevent. Omitting it is a type error.
 *
 * IT IS STORED, NEVER DERIVED FROM `method` AT READ TIME. The two are
 * independent axes and conflating them is wrong in both directions: `Fund
 * Transfer` is a payment RAIL that a bill payment uses (Tony Roma's, Touch N Go,
 * IKEA and AIA all pay by it), while a `Crypto Transfer` is never a purchase in
 * Monarch — it is an investment move or money sent to a person (Teku's ruling,
 * 30 Sept 2026). A read-time rule over `method` would have to encode that
 * asymmetry in every reader; the field states it once, in the data.
 *
 * THERE IS DELIBERATELY NO `'income'` VALUE. Direction is carried by the SIGN of
 * `amount`, and `countsToward` already excludes every non-negative row, so an
 * income value would encode in a field what the sign already encodes — and the
 * two could then disagree. The only case that would earn the distinction is
 * salary, which this ledger does not contain and which would need counterparty
 * data no row carries (Teku's ruling, 30 Sept 2026).
 */
export type TransactionKind = 'payment' | 'transfer'
/**
 * WHAT A TRANSACTION DETAIL SCREEN SHOULD SAY ABOUT A ROW — Gate 79.
 *
 * DERIVED, NEVER STORED, AND THAT IS THE WHOLE DESIGN. `transactionDisposition`
 * in `derive.ts` computes it from `kind` and the sign of `amount`, both of which
 * every row already carries. A stored field would be a third copy of a fact the
 * record states twice — the shape `Transaction.hasReceipt` had before Gate 48
 * deleted it, and the shape `savedAmount`-versus-contributions is explicitly
 * allowed to keep only because a Top-Up writes both.
 *
 * WHY THE DETAIL SHEET NEEDS IT: a receipt is an itemisation of a purchase. A
 * statement gives one total and no line items, which is the entire reason
 * receipts exist in Monarch — so a purchase gets the receipt loop, and a
 * movement of money that itemised nothing cannot have a receipt at all and gets
 * a summary of where the money went instead. Before Gate 79 every row got the
 * receipt loop, which is what `MODEL-2` registered.
 *
 * `'income'` HAS NO ROW IN THE CURRENT SEED, AND THAT IS NOT A REASON TO DROP
 * IT. All three of this ledger's credits are `kind: 'transfer'` (Gate 75
 * Decision 1 = A), so the transfer branch claims them first and income is
 * unreachable from the seed — measured, 20 purchase / 33 transfer / 0 income.
 * It is a GUARD rather than a feature: a `payment` with a non-negative amount is
 * representable, and the day one exists it must not be offered a receipt. A
 * two-value union would make that row a purchase by default, which is the
 * `MODEL-2` defect returning through a different door.
 */
export type TransactionDisposition = 'purchase' | 'transfer' | 'income'


/**
 * Who the row is with — a curated merchant mark, a person, a photograph of the
 * merchant, or a savings goal.
 *
 * A DISCRIMINATED UNION rather than a bag of optional fields, for the same
 * reason `Holding` is one: the four cases render through DIFFERENT DS
 * components with disjoint inputs, so `{ logo?, initials?, filename? }` would
 * admit every combination of set and unset — a lattice of meaningless states
 * that every call site would then have to defend against. The tag makes the
 * render a total switch instead, and `TransactionMark` is that switch.
 *
 * THE `person` CASE INVOLVES NO IMAGE ASSET, AND STILL DOES NOT. `Avatar` takes
 * `initials`, verified against the pinned `dist/components/Avatar/Avatar.d.ts`,
 * so a person row needs no photograph. Inventory §F describes Figma's people as
 * avatar PHOTOGRAPHS; initials are the substitution, and they are a substitution
 * rather than a shortcut — a photograph of a fictional person is product data
 * this repo has no source for.
 *
 * ──────────── `image` — AN ARBITRARY MERCHANT PHOTOGRAPH (Gate 53) ───────────
 *
 * THIS IS THE CASE THE DS CANNOT SERVE, AND THAT IS WHY IT IS HERE. `Logo` takes
 * a `name` out of the closed `LogoName` registry — curated vector brand marks,
 * drawn once and shared by every consumer. A photograph of ONE merchant's
 * shopfront signage is the opposite of that: it is per-record product data, in
 * exactly the category the ten receipt photographs are already in, and a design
 * system has no business shipping it. So it is not a DS gap and no gap number
 * was opened — see the note on `Receipt.filename` and `receiptUrl()`, which is
 * the precedent this follows rather than a new pattern.
 *
 * IT STORES A BARE FILENAME, NOT A URL, for the same reason `Receipt` does: the
 * directory is `src/config/media.ts`'s to own (`transactionLogoUrl()`), and a
 * record that spelled `/media/transactions/…` itself would be the literal
 * `/media/` path that file's own top-level rule forbids.
 *
 * IT RENDERS THROUGH `Avatar src`, NOT THROUGH `Logo`. `Avatar` already frames a
 * photograph in a fixed circle and `.mn-avatar--photo img` crops it with
 * `object-fit: cover` — verified at render, not read off the stylesheet — so an
 * arbitrary aspect ratio fills the frame without distorting. No MVP stylesheet
 * and no DS change was needed.
 *
 * THE FIELD IS STILL CALLED `logo`, THOUGH ONE OF ITS THREE CASES IS NOW A
 * PHOTOGRAPH AND NOT A LOGO AT ALL. The `merchant` case still dominates, every
 * read site already spells `logo`, and `TransactionMark` is the only thing that
 * reads the tag — so a rename would touch every consumer to buy a better word
 * and no behaviour. Recorded as a deliberate imprecision rather than left to be
 * rediscovered.
 *
 * -------- `goal` - A SAVINGS GOAL'S OWN PHOTOGRAPH (Gate 77) --------
 *
 * A FOURTH CASE RATHER THAN A REUSE OF `image`, AND THE REASON IS THE
 * DIRECTORY. Gate 77 moved goal contributions into this ledger, so a row's
 * counterparty can now be a savings goal, carrying the goal's own photograph.
 * `image` was the obvious reuse and it does not work: its filename resolves
 * through `transactionLogoUrl()` to `/media/transactions`, while a `Goal.image`
 * lives in `/media/goals` and is resolved by `goalImageUrl()`. Two collections,
 * owned by two records, and `media.ts`'s top-level rule is that the DIRECTORY is
 * its business and never a component's.
 *
 * THE TWO ALTERNATIVES ARE BOTH WORSE. Copying the JPEGs into
 * `/media/transactions` duplicates bytes and puts one photograph in two places
 * nothing keeps in step. Adding a directory discriminant to `image`
 * (`{ kind, filename, dir }`) is the bag of optionals this union exists to
 * avoid, one level down.
 *
 * IT CARRIES THE FILENAME AND NOT THE GOAL ID, deliberately. `TransactionMark`
 * is a presentational switch that resolves one url; handing it a goal id would
 * make it reach for the goals collection, which is a data dependency a mark has
 * no business having. The row already carries `goalId` for anything that needs
 * the record.
 *
 * ADDING IT WAS A COMPILE ERROR UNTIL `TransactionMark` HANDLED IT, which is
 * exactly what that switch's missing `default` is for - see its header.
 */
export type TransactionLogo =
  | { kind: 'merchant'; name: LogoName }
  | { kind: 'person'; initials: string }
  | { kind: 'image'; filename: string }
  | { kind: 'goal'; filename: string }

export interface Transaction {
  id: string
  /** Merchant display name, or the person's name. */
  merchant: string
  /** Merchant mark or person — see `TransactionLogo` (inventory §7). */
  logo: TransactionLogo
  /** Figma: the caption under the merchant — "Card Payment". */
  method: TransactionMethod
  /**
   * Spending, or a money-move — see `TransactionKind`. Budgets count `payment`
   * rows only.
   */
  kind: TransactionKind
  /** Negative for an outflow. */
  amount: Amount
  currency: CurrencyCode
  /** ISO 8601 local timestamp. Formatting is `format.ts`'s job, not the data's. */
  occurredAt: string
  category: TransactionCategoryId
  /**
   * NO `hasReceipt` FIELD. IT WAS HERE UNTIL GATE 48 AND ITS ABSENCE IS THE
   * POINT — do not add it back.
   *
   * It was a stored boolean on 10 of 23 rows, and nothing anywhere kept it in
   * step with the receipt collection that is the actual evidence. Two copies of
   * one fact: a row asserting "I have a receipt", and a `Receipt` asserting "I
   * belong to that row". Delete a receipt and the row goes on drawing the glyph;
   * add one and the row does not.
   *
   * `transactionHasReceipt(receipts, id)` in `derive.ts` answers it from the
   * receipts instead, which is inventory §6's rule ("a figure that is computable
   * from another figure is not stored") applied to a boolean rather than to a
   * total. The render path is unchanged — `ListItem.hasReceiptIcon` still takes
   * a boolean; it is now computed at the call site rather than read off the row.
   */
  /**
   * The savings goal this row paid into, when it is a contribution.
   *
   * OPTIONAL, UNLIKE `kind`, AND THE ASYMMETRY IS DELIBERATE. Omission is the
   * norm - 25 of the 53 seeded rows carry no goal - so requiring it would be
   * noise on every ordinary row rather than a guard. `kind` is required because
   * omitting IT silently counts a row toward a budget; omitting this one means
   * the row is not a contribution, which is the common case and is true.
   *
   * IT IS THE JOIN, AND IT REPLACED AN EMBEDDED LIST (Gate 77). A goal used to
   * carry its own `contributions` array, which made a contribution a second kind
   * of money movement living outside the ledger - invisible to the Transactions
   * tab, to its search and facets, and to the account drill-down the money
   * actually left. `goalContributions()` in `derive.ts` filters the one ledger on
   * this field instead.
   *
   * `Goal.savedAmount` IS STILL STORED AND IS STILL NEVER SUMMED FROM THESE
   * ROWS. That is `savedAmount`'s own contract and this change does not weaken
   * it: the seeded rows happen to sum to the two stored totals today, nothing
   * depends on that, and no test asserts it, because a Top-Up keeps the two in
   * step only by writing both.
   */
  goalId?: string
  /**
   * How a contribution was made - see `ContributionSource`.
   *
   * IT MUST BE SET EXACTLY WHEN `goalId` IS, AND THE TYPE CANNOT SAY SO. Two
   * peer optionals admit both-set and neither-set, which is the lattice
   * `TransactionLogo`'s tag exists to collapse - so this is a weaker shape than
   * this file usually accepts, and it is stated rather than hidden. Grouping the
   * pair into one optional object would have made the invariant a type error,
   * and would also have made every reader spell `t.contribution?.goalId` for a
   * field the model names as `goalId`. The invariant is asserted in
   * `e2e/goals.spec.ts` in both directions instead.
   *
   * IT IS CARRIED RATHER THAN DROPPED BECAUSE FIGMA'S GOAL DRILL-DOWN TITLES ITS
   * ROWS WITH IT - "Auto Save" and "Manual Top Up", read off `1266:14344` - and
   * nothing else on a row could reconstruct it. Deriving it from the amount
   * (`amount === autoSave.amount`) would call a manual top-up of exactly the
   * auto-save figure automatic, which is wrong for a value the user chose.
   */
  contributionSource?: ContributionSource
  /**
   * Which account the row moved through.
   *
   * Joins to `BankHolding.accountId` for the two cash accounts. Flow 8 widened
   * the RANGE, not the type: a `Crypto Transfer` did not move through a bank
   * account, so those rows carry a `CryptoWallet.id` instead. That join is
   * one-way and currently unread — `holdingFields`' `crypto-wallet` case renders
   * the TOKEN list, not transactions — so a wallet id here reaches no
   * drill-down. Recorded rather than invented: the alternative was attributing a
   * crypto movement to a savings account, which is false.
   *
   * Added by Flow 7 so a bank holding's drill-down can show its own rows. It
   * was an ATTRIBUTION of the existing ledger, not new transactions: no
   * merchant, amount, date or category changed at THAT flow.
   *
   * THE "GROCERIES STILL SUMS TO RM 1,800.00" CLAUSE THAT USED TO END THIS
   * PARAGRAPH IS GONE, BECAUSE GATE 48 BROKE IT DELIBERATELY. Reconciling every
   * linked row's amount to its receipt's printed total moved four of the five
   * groceries rows, and `categoryTotal('groceries')` now computes 1118.46. See
   * the Gate 48 block in `transactions.ts`. The figure is no longer a check on
   * anything, and quoting 1,800 anywhere is quoting a fact that stopped being
   * true.
   */
  accountId: string
}

// -------------------------------------------------------------- crypto

/** A named grouping of holdings — Figma: "Marg's Wallet", "Fun Tokens". */
export interface CryptoWallet {
  id: string
  /**
   * Figma calls the Homepage wallet "Marge's Crypto" and the same wallet
   * "Marg's Wallet" on the transfer screens (inventory F5 A6, FIX IN FIGMA —
   * "pick one"). Recorded here as one name per wallet; the divergence is a
   * source defect, not a data-shape problem.
   */
  name: string
  logo: LogoName
}

export interface CryptoHolding {
  id: string
  walletId: string
  /** "Bitcoin". */
  name: string
  /** "BTC". */
  symbol: string
  /** DS `Logo` name — `bitcoin`, `ethereum`, `tether`, `stellar`, `uniswap`. */
  logo: LogoName
  /** Units held. */
  quantity: number
  /** Decimal places this token is quoted to — 6 for BTC, 0 for XLM, etc. */
  quantityDecimals: number
  /** Fiat value of the holding. The wallet total is `sum` of these, never stored. */
  valueMyr: Amount
  /**
   * Percentage move, where Figma records one. `0` means "no movement recorded",
   * not "unchanged in reality" — only Bitcoin and Ethereum carry a figure on the
   * Homepage, and inventing the other three would be inventing product data.
   */
  changePct: number
}

/**
 * A market row in Homepage_Crypto's "Featured Coin" section. NOT a holding —
 * these carry a price and a move, no quantity, and are not part of the wallet
 * total. The sparkline that Figma draws beside them is a Rule-3 gap (C1) and is
 * deliberately absent from this type.
 */
export interface FeaturedCoin {
  id: string
  name: string
  symbol: string
  logo: LogoName
  priceMyr: Amount
  changePct: number
  /**
   * Price history for the row's sparkline, oldest first.
   *
   * MOCK TODAY, and the shape a real feed will fill — `LineChart` takes a plain
   * `number[]`, so swapping mock for live prices touches this file and nothing
   * else. No colour and no geometry here: the hue is derived from the trend
   * direction at the render site, so the line and the trend triangle cannot
   * disagree (the same rule `trendDirection` already follows).
   *
   * Two invariants the mock holds, so it cannot contradict the row beside it:
   *   1. `series[series.length - 1] === priceMyr` — the line ends at the quoted
   *      price.
   *   2. `last / first` reproduces `changePct` to within whole-MYR rounding, so
   *      a row reading +250.68% cannot draw a falling line.
   */
  series: number[]
}

// ------------------------------------------------------------ holdings

/**
 * Flow 7 — the Finance Overview's unit of net worth.
 *
 * A HOLDING is anything the net-worth figure is a sum of. The eight cards Figma
 * draws span four categories with four different shapes behind them, and the
 * drill-down screen renders a different field set per shape — so this is a
 * DISCRIMINATED UNION, not one wide optional-everything interface. The type tag
 * is what lets the drill-down template be one component with an exhaustive
 * switch, rather than nine screens or a pile of `field && <Row/>`.
 *
 * THE ARITHMETIC RULE STILL HOLDS. A holding stores what it is, not what it is
 * worth, wherever the worth is computable: Gold stores grams and a price, an
 * investment stores its lines, a wallet stores nothing at all and reads the
 * token list. `holdingValue()` in `derive.ts` is the only thing that turns a
 * holding into a number, and net worth is `sum(holdings.map(holdingValue))`.
 */
export type HoldingType =
  | 'fixed-deposit'
  | 'bank'
  | 'joint'
  | 'stocks'
  | 'unit-trust'
  | 'prs'
  | 'gold'
  | 'crypto-wallet'

/**
 * The card's caption line — Figma's four groupings, verbatim.
 *
 * ⚠️ Recorded because it is easy to get wrong from memory: the categories are
 * Bank Account / Investment / Assets / Crypto Wallet, and their badge hues are
 * teal / green / yellow / orange. NOT "bank = blue" and NOT "assets = gold".
 */
export type HoldingCategory =
  | 'Bank Account'
  | 'Investment'
  | 'Assets'
  | 'Crypto Wallet'

interface HoldingBase {
  id: string
  category: HoldingCategory
  /** Figma: the card's second line — "Fixed Deposit", "Main", "Stocks". */
  name: string
  /** DS `Icon` name for the card badge. */
  icon: IconName
  /**
   * The badge tint Figma paints per category.
   *
   * Rendered on both screens as of DS v1.3.0: the overview passes it to
   * `CardBalance.iconColor`, and the drill-down hero composes `IconObject`
   * directly. Measured from Figma per category, not chosen here.
   */
  badgeColor: IconObjectColor
  /**
   * Recent movement, where the file records one.
   *
   * `0` means "no movement recorded", never "unchanged in reality" — the same
   * convention `CryptoHolding.changePct` already sets, and the reason the DS
   * ships a `'flat'` trend direction at all. Only the crypto wallets carry a
   * real figure, derived from their own tokens; the equity and fund holdings
   * are flat because NOTHING IN THE FILE STATES A MOVE FOR THEM and authoring
   * one would be authoring product data.
   */
  changePct?: number
  /**
   * Cost basis, where the drill-down shows an "Invested" tile.
   *
   * AUTHORED (see `holdings.ts`) — the file records no cost basis anywhere.
   */
  invested?: Amount
}

/**
 * A term deposit. Its value is stored and its PRINCIPAL IS DERIVED — B3, and
 * the reverse of the intuitive direction. RM 150,000 is the authoritative
 * current value (it is the figure the overview card and the drill-down hero
 * both draw); Figma's "Principal Amount RM 125,000" does not reconcile with it
 * at 3.5% over any term the same screen states, so the principal is recomputed
 * from value, rate and elapsed time instead of transcribed.
 */
export interface FixedDepositHolding extends HoldingBase {
  type: 'fixed-deposit'
  currentValue: Amount
  /** Annual simple rate as a percentage — Figma: "3.5% p.a". */
  ratePct: number
  /** Whole years from start to maturity. Figma draws a three-year term. */
  termYears: number
  /**
   * Months from `TODAY` to maturity. Figma writes "15 Months" remaining, so the
   * maturity date is TODAY + 15 months and the start date is three years before
   * that — B5, every date an offset. The literal dates Figma prints
   * ("15 Dec 2023" / "15 Dec 2026") are NOT reproduced; they were true when the
   * file was drawn and are stale now.
   */
  remainingMonths: number
}

/** A cash account — the Main account, and the Joint account from Flow 4. */
export interface BankHolding extends HoldingBase {
  type: 'bank' | 'joint'
  balance: Amount
  /** Masked, as a statement would print it. AUTHORED. */
  accountNo: string
  bank: string
  /** "Savings Account", "Joint Savings". */
  accountType: string
  /** Which ledger rows belong to this account. */
  accountId: string
}

/** One equity line inside the Stocks holding, or one fund inside UT / PRS. */
export interface InvestmentLine {
  id: string
  name: string
  /** Ticker for an equity; omitted for a fund, which has none. */
  symbol?: string
  valueMyr: Amount
  changePct: number
}

/** Stocks, Unit Trust and PRS — same shape, three different labels. */
export interface InvestmentHolding extends HoldingBase {
  type: 'stocks' | 'unit-trust' | 'prs'
  /** Heading above the line list on the drill-down. */
  linesLabel: string
  lines: InvestmentLine[]
}

/** Physical gold. Value is `grams * pricePerGram`, never stored. */
export interface GoldHolding extends HoldingBase {
  type: 'gold'
  grams: number
  pricePerGram: Amount
}

/** A crypto wallet. Holds nothing itself — its value is its token list. */
export interface CryptoWalletHolding extends HoldingBase {
  type: 'crypto-wallet'
  /** Joins to `CryptoWallet.id`, which joins to `CryptoHolding.walletId`. */
  walletId: string
}

export type Holding =
  | FixedDepositHolding
  | BankHolding
  | InvestmentHolding
  | GoldHolding
  | CryptoWalletHolding

// ------------------------------------------------------------- content

/**
 * A Smart Insights card. `titleToken` is a DS token NAME, never a value — the
 * card's title colour varies per insight in Figma, and architecture §3.4's
 * resolution 2 is to store the name and let the component compose `var(--…)`.
 */
export interface SmartInsight {
  id: string
  title: string
  titleToken?: string
  description: string
  /** Leading glyph, when the card is icon-led. */
  icon?: IconName
  /** Leading merchant marks, when the card is logo-led. Mutually exclusive with `icon`. */
  logos?: LogoName[]
  /** Figma renders a "+N" overflow chip after the logos. Derived, not stored. */
  logoOverflow?: number
  linkLabel: string
}

/** A `card/features and education` tile. `variant` is a DS prop, not a colour. */
export interface FeatureCard {
  id: string
  title: string
  icon: IconName
  variant: 'blue' | 'orange' | 'green' | 'purple' | 'outline'
}

/** The `❖ System message` promo block above the feature tiles. */
export interface PromoMessage {
  id: string
  title: string
  subtitle: string
  linkLabel: string
}

// ------------------------------------------------------------- receipts

/**
 * One line on a receipt, as PRINTED — not as reinterpreted.
 *
 * `quantity` IS A STRING, DELIBERATELY, AND IT IS THE FIELD MOST LIKELY TO BE
 * "FIXED" INTO A NUMBER BY A LATER SESSION. A receipt prints a quantity the way
 * the till printed it, and across the ten delivered images that is sometimes a
 * count (`1`) and sometimes a count carrying the unit that gives it meaning
 * (`1` against `Basmathi Rice 5kg`, where the 5kg belongs to the item name).
 * Typing it as a number forces every future weight-priced line — `0.482 kg @
 * RM 34.90` — either to lose its unit or to sprout a second field beside it.
 *
 * NOTHING COMPUTES FROM IT, which is what makes the string safe. `total` is the
 * stored figure the ledger follows; the line items are transcription, and the
 * app does not multiply quantity by price anywhere. See `Receipt.total` for why
 * the sum is not derived from these.
 */
export interface ReceiptLineItem {
  /** As printed — "Nestle Milo 2kg", "Classic Ribs (Half)". */
  name: string
  /** As printed. See the note above for why this is not a number. */
  quantity: string
  /** The line's price in MYR, positive. A receipt prints no signs. */
  price: Amount
}

/**
 * A captured receipt.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `filename` AND `displayName` ARE TWO DIFFERENT FACTS AND MUST NOT BE COLLAPSED.
 *
 * `filename` is where the bytes are: `receipt_aeonbig01.jpg`, resolved through
 * `receiptUrl()` in `src/config/media.ts`. It is a developer-authored path and
 * a user never sees it.
 *
 * `displayName` is what the CARD PRINTS: `IMG_4821.jpg`. It is what a phone's
 * camera roll would have called the capture, which is what Figma draws and what
 * a user would recognise. Storing one and deriving the other is not possible in
 * either direction — `receipt_aeonbig01` cannot produce `IMG_4821`, and
 * `IMG_4821` cannot find the file — so both are stored.
 * ─────────────────────────────────────────────────────────────────────────────
 * THE LINK IS A TRANSACTION ID, AND IT IS THE ONLY COPY OF THAT FACT.
 *
 * `Transaction.hasReceipt` USED TO BE A STORED BOOLEAN ON THE LEDGER and was
 * deleted at Gate 48. It was the same fact written twice — a row saying "I have
 * a receipt" and a receipt saying "I belong to that row" — with nothing keeping
 * them in step, so a receipt deleted here would have left a ledger row still
 * drawing the glyph. `transactionHasReceipt()` in `derive.ts` answers the
 * question from this collection instead, which is the §6 rule ("a figure that is
 * computable from another figure is not stored") applied to a boolean.
 *
 * `null` IS A REAL STATE, NOT A PLACEHOLDER. Figma draws `Item/receipts` in two
 * variants, `Linked=Yes` and `Linked=No`, and the unlinked one is what a capture
 * looks like before it has been matched. All ten records ship LINKED at Gate 48;
 * the type admits `null` because the variant exists and an unlink action needs
 * somewhere to put the result. That action shipped at Gate 49 — this line said
 * "Gate 51's" until Gate 51 corrected it; Gate 51 added the receipt viewer's own
 * Unlink, which writes the same field through the same `unlinkReceipt`.
 *
 * -- THE LINK IS NOW TRANSACTION-INITIATED TOO. THE DIRECTION IS UNCHANGED. --
 *
 * REVISED AT GATE 52, NOT VIOLATED, and the distinction is the whole point.
 * THIS FIELD IS STILL THE ONLY EXPRESSION OF THE RELATIONSHIP: a receipt points
 * at a transaction, no transaction holds a receipt id, and
 * `linkReceipt(receiptId, transactionId)` is still the only mutator that sets
 * it. Nothing about the data direction moved.
 *
 * WHAT MOVED IS WHO STARTS THE ACT. Until Gate 52 a link could only be made
 * from the RECEIPT side -- auto-match at add time (Gate 50-C), or the manual
 * picker inside the receipt viewer (Gate 51-B). The source picker’s "Receipt
 * library" row now makes one from the TRANSACTION side, choosing among the
 * receipts where this field is `null`.
 *
 * SO A STATEMENT LIKE "linking direction: receipt -> transaction only" WAS
 * DESCRIBING TWO DIFFERENT THINGS AT ONCE -- the data direction and the entry
 * point. The first holds and is structural; the second is now either side.
 */
export interface Receipt {
  id: string
  /**
   * The file's own name — "receipt_ikea01.jpg". Bare, no path, no leading `/`.
   *
   * FOR A SEEDED RECEIPT THIS IS ALSO ITS LOCATION, under
   * `public/media/receipts/`. For one CAPTURED in-app (Gate 50) it is the name
   * of the file the user chose and nothing more — the bytes live in memory and
   * `sourceUrl` says where. Both are printed by the type badge and both are the
   * honest answer to "what is this file called", which is why capture did not
   * need a second field for the name.
   */
  filename: string
  /**
   * An ALREADY-RESOLVED url for this capture's image, or absent.
   *
   * ABSENT IS THE NORMAL CASE and is what all ten seeded records carry: their
   * bytes are shipped, so `receiptUrl(filename)` locates them. A receipt
   * captured through a file input has no shipped bytes at all — its image is an
   * `URL.createObjectURL` blob — so it carries the url outright and
   * `receiptImageUrl()` prefers it.
   *
   * AN OPTIONAL OVERRIDE RATHER THAN A TAGGED UNION, AND THAT IS A DELIBERATE
   * DEPARTURE FROM THE `TransactionLogo` PRECEDENT. That one is a union because
   * its branches render through DIFFERENT DS components with disjoint inputs, so
   * a `{ logo?, initials? }` pair would admit both-set and neither-set. Here both
   * branches produce ONE string and render through the SAME `<img>`: this is one
   * fact — where the bytes are — with two resolution paths, and a single
   * resolver is the place that decides between them. A union would have touched
   * all ten records and every read site to express nothing extra.
   *
   * IT IS NOT PERSISTED AND CANNOT BE. A blob url is valid only for the document
   * that created it; a reload restores the seed, like every other write in
   * `AccountsProvider`.
   */
  sourceUrl?: string
  /** What the card prints, camera-roll style. See the note above. */
  displayName: string
  /** ISO 8601 local timestamp, transcribed from the receipt's own printed date. */
  capturedAt: string
  /**
   * WHEN THIS RECEIPT ENTERED THE LIBRARY — Gate 58. `YYYY-MM-DDTHH:mm:ss.SSS`,
   * zone-less local wall clock like every other timestamp here, TO THE
   * MILLISECOND.
   *
   * THE RECEIPTS TAB GROUPS AND ORDERS ON THIS, NOT ON `capturedAt` (Teku's
   * ruling, 18 Sept, option C). Filing by the printed date put a receipt a user
   * had just added under its paper's month — years back for old till paper, and
   * three screens below everything else. `capturedAt` is still what the card
   * prints and still the only date auto-match reads.
   *
   * OPTIONAL ON THE TYPE ONLY BECAUSE THE SEED PREDATES IT. `backfillAddedAt`
   * (`derive.ts`) fills it on first load from `capturedAt`, so every receipt
   * the app holds carries one; `capturedToReceipt` writes it for a capture. A
   * receipt that reaches the Receipts tab without one is a defect, and the
   * grouping says so rather than guessing.
   */
  addedAt?: string
  /** The merchant as the receipt's own letterhead prints it. */
  merchant: string
  /**
   * The receipt's printed TOTAL, positive, in MYR.
   *
   * STORED RATHER THAN SUMMED FROM `lineItems`, AND THAT IS NOT A BREACH OF THE
   * DERIVE RULE — it is the rule applied honestly. A till total is not the sum
   * of the line prices: it is subtotal plus SST, and on several of the delivered
   * images the printed subtotal does not equal the printed lines either (see
   * `receipts.ts`, which records each discrepancy rather than papering over it).
   * Deriving would mean INVENTING a number the paper does not show. What IS
   * derived from this is the linked transaction's amount — see `receipts.ts`.
   */
  total: Amount
  /**
   * The receipt's printed SST line, positive, in MYR — or `null` where the
   * paper prints no tax line at all (AIA, the one insurance receipt).
   *
   * TRANSCRIBED, LIKE `total`, AND FOR THE SAME REASON. It is a figure the
   * till printed, not one the app is entitled to compute: deriving it as
   * `total - subtotal` would produce a number the paper does not show, and on
   * the six receipts whose lines do not sum to their printed subtotal it
   * would produce a visibly non-6% "6% SST".
   *
   * THE SUBTOTAL IS THE OPPOSITE CASE AND IS **NOT** STORED. It is the sum of
   * `lineItems`, computed by `receiptSubtotal()` in `derive.ts` — the §6 rule
   * applied where it genuinely applies. Storing a printed subtotal beside the
   * lines it is supposed to be the sum of is the same fact written twice,
   * which is exactly what `Transaction.hasReceipt` was.
   *
   * SO THE THREE FIGURES DO NOT CLOSE ON SIX OF THE TEN, AND AS OF GATE 49
   * THAT IS VISIBLE ON SCREEN. `receipts.ts` records every discrepancy; the
   * detail sheet renders derived subtotal, printed tax and printed total one
   * under the other, so an artwork defect that was previously unreachable is
   * now something a reader can see. That is a deliberate consequence of the
   * derive ruling, not an oversight — see `TransactionDetailSheet.tsx`.
   */
  tax: Amount | null
  currency: CurrencyCode
  lineItems: ReceiptLineItem[]
  /** `Transaction.id`, or `null` for an unlinked capture. */
  transactionId: string | null
}

// ------------------------------------------------------ goals (Flow 11, Gate 75)

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * A SAVINGS GOAL. Money the user owns, held outside the two cash accounts.
 *
 * GOALS ARE THEIR OWN COLLECTION, NOT A `Holding` VARIANT, and that was a
 * decision with three reasons rather than a filing preference:
 *
 *   1. `netWorth` sums `holdings`. A `Holding` variant would raise net worth the
 *      moment the seed landed, and no screen consumes goal money until Gate 76
 *      adds the "Savings Goals" card — so the figure would move before anything
 *      explained it. As a separate collection the seed is provably inert.
 *   2. A GOAL IS NOT A SPENDABLE ACCOUNT. Gate 79's Top-Up picks its source from
 *      the cash accounts; a goal must never appear in that picker, and keeping
 *      goals out of `Holding` makes that true by construction rather than by a
 *      filter somebody has to remember.
 *   3. Every `Holding` renders through `holdingFields` and the holding
 *      drill-down. A goal has its own screen at `/finance/plans/goals/:goalId`,
 *      so a `Holding` variant would also hand it a route it should not have.
 *
 * Gate 76 sums this collection into the balance grid as one combined card, on
 * the Joint Account precedent of a card Figma does not draw.
 *
 * NP1: EVERY FIELD IS PLAIN SERIALISABLE DATA — strings, numbers, a boolean and
 * an array of the same. No `Date`, no function, no class instance, so the
 * persistence that arrives after Flow 11 is a storage adapter, not a rewrite.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export interface Goal {
  id: string
  /** The card's title — "Bali Trip", "Emergency Funds". */
  name: string
  /** What the user is saving toward. Positive, in MYR. */
  targetAmount: Amount
  /**
   * What is saved so far. A STORED value, not a sum of `contributions`.
   *
   * SAME RATIONALE AS `FiatAccount.balance`, and it is the reason that field is
   * stored too: `contributions` is a partial slice of history — Figma's drill-down
   * shows "Recent Contributions", not every movement since the goal opened — so it
   * cannot reconstruct a balance and must not be asked to. Gate 79's Top-Up writes
   * both: one ledger entry and this figure.
   */
  savedAmount: Amount
  /**
   * `'YYYY-MM-DD'`. A date the user TYPED, so it is exempt from B5 (see
   * `today.ts`) for the same reason `Budget.from`/`to` are, and it is compared as
   * a STRING for the same reason: a zone-less date turned into a `Date` brings the
   * device's timezone into the answer.
   */
  targetDate: string
  /**
   * A BARE FILENAME, never a URL and never a `blob:`.
   *
   * The directory is `src/config/media.ts`'s to own, which is the precedent
   * `Receipt.filename` and `TransactionLogo`'s `image` case already set — a record
   * that spelled `/media/...` itself would be the literal path that file's own
   * top-level rule forbids. A `blob:` would not survive the document that made it,
   * which is why a photo picker waits for persistence's image storage.
   */
  image: string
  /**
   * The auto-save setting, STORED WITH NO SCHEDULED BEHAVIOUR.
   *
   * Nothing in this app runs on a timer, and nothing reads this to move money.
   * It is stored because Figma's drill-down draws the toggle and the amount, and
   * because Academy's Essential Task "Set Up Auto-Save Goal — 3 of 6" reads
   * whether it is on. Gate 78 is where that reader arrives.
   *
   * THE AMOUNT SURVIVES THE TOGGLE GOING OFF, deliberately: switching auto-save
   * off and on again should not silently forget the figure the user typed. So the
   * amount is meaningful only while `isEnabled`, and it is not cleared.
   */
  autoSave: GoalAutoSave
  /**
   * NO `contributions` FIELD. IT WAS HERE UNTIL GATE 77 AND ITS ABSENCE IS THE
   * POINT - do not add it back.
   *
   * It was an embedded array of `GoalContribution`, which made a contribution a
   * second kind of money movement living outside the ledger. Twenty-eight real
   * transfers were invisible to the Transactions tab, to its search and facets,
   * to the account drill-down the money left, and to anything that asks "what
   * happened to my money". Same defect class as the stored `hasReceipt` boolean
   * Gate 48 removed: one fact modelled twice, in two places nothing reconciles.
   *
   * `goalContributions(transactions, goalId)` in `derive.ts` answers it from the
   * one ledger instead, filtered on `Transaction.goalId`.
   */
}

/** The auto-save setting. See `Goal.autoSave`. */
export interface GoalAutoSave {
  isEnabled: boolean
  /** Positive, in MYR. Meaningful only while `isEnabled`; never cleared. */
  amount: Amount
}

/**
 * How a contribution reached a goal. See `Transaction.contributionSource`.
 *
 * A TWO-VALUE UNION RATHER THAN AN `isAutomatic` BOOLEAN, because Figma labels
 * the rows in words ("Auto Save", "Manual Top Up", node `1266:14344`) and a
 * boolean would need a lookup table at every read site to get back to them. It
 * also leaves room for a third origin - an interest credit, say - without every
 * reader having to re-interpret `false`.
 *
 * IT SURVIVED THE MOVE INTO THE LEDGER (Gate 77) WHILE `GoalContribution` DID
 * NOT. That record's other three fields all had a `Transaction` counterpart -
 * `id`, `amount`, and `date` widening into `occurredAt` - and this one had none,
 * so it is the only part of the old shape that had to be carried across.
 */
export type ContributionSource = 'automatic' | 'manual'

// ------------------------------------------------ commitments (Flow 11, Gate 75)

/**
 * A recurring obligation — Figma's Commitments half of the Plans tab.
 *
 * SEEDED AND READ-ONLY IN FLOW 11, WITH NO LINK TO THE LEDGER (Claude,
 * delegated: 4I). The amounts here disagree with the ledger's own Netflix,
 * Anytime Fitness, U Mobile and Celcom rows, and that is accepted rather than
 * reconciled: linking a bill to its charges needs merchant rules this app does
 * not have, and inventing the link would put a false join on screen. `Internet`
 * is the clearest case — the commitment is RM 120.00 (the figure Figma's own
 * smart-insight panel calls "Current") while the ledger's U Mobile row is
 * RM 75.00.
 */
export interface Commitment {
  id: string
  /** Figma: the row's title — "Internet", "Mortgage". */
  name: string
  /** The provider's mark — see `CommitmentLogo`. */
  logo: CommitmentLogo
  /** Positive, in MYR: what is charged each period. */
  amount: Amount
  cadence: CommitmentCadence
  /**
   * `'YYYY-MM-DD'` — when the next charge falls.
   *
   * STORED, NOT DERIVED FROM A PAYMENT DAY. Deriving it would need a rule for
   * every cadence plus a rule for month-ends (a "31st" commitment in February),
   * and Flow 11 renders this and nothing else. Gate 78 is where a derivation
   * would earn its keep, if a screen ever needs the day rather than the date.
   */
  nextDueOn: string
  category: TransactionCategoryId
  /**
   * Who the user actually pays, where that differs from what they call the
   * commitment. Figma's header reads "Internet" and its hero reads
   * "U-Mobile" (`1266:14343`).
   *
   * OPTIONAL, AND IT FALLS BACK TO `name`. Figma draws exactly ONE commitment
   * detail, so the other six heroes are undesigned work — inventing a provider
   * for each would be six fabrications to fill a field. A row without one
   * shows its own name, which is true rather than invented.
   */
  provider?: string
  /**
   * The specific product — Figma's "U120 Plan", below the provider name.
   *
   * OPTIONAL, AND THE LINE IS OMITTED WHEN ABSENT rather than drawn with an em
   * dash. `UNREAD_FIGURE` means "this field exists and was not read"; these
   * rows have no plan name at all, so a dash would assert something false —
   * the Gate 79 rule for the transfer summary's Type row.
   */
  planName?: string
  /**
   * Which account pays it — a `FiatAccount` id, so the detail can NAME the
   * account rather than restate it as a string.
   *
   * ATTRIBUTED TO `main` WHOLESALE FOR EVERY SEEDED ROW, which is the Gate 77
   * precedent for the 28 relocated contributions. Figma states it only for
   * Internet ("Bank Acc - Main"), Main is the primary cash account, and
   * attributing all seven is reversible in one edit.
   *
   * IT IS NOT DERIVED FROM THE LEDGER. Nothing joins a commitment to a
   * transaction (Claude, delegated: 4I), and Internet is where that shows: the
   * plan is RM 120.00 while `txn-umobile-0820` is RM 75.00.
   */
  paymentAccountId: string
  /**
   * `'YYYY-MM-DD'` — when the contract ends, where one does.
   *
   * OPTIONAL, AND THE CARD IS OMITTED WHEN ABSENT. Only the Internet detail
   * draws it; a mortgage or a gym membership may genuinely have no end date,
   * so an absent card is the honest render and the grid wraps to three.
   */
  contractEndsOn?: string
}

/**
 * How often a commitment is charged.
 *
 * ALL FIVE SEEDED ROWS ARE `'monthly'`; `'yearly'` HAS NO INSTANCE YET, and it
 * is in the union rather than added later because this domain plainly contains
 * yearly obligations — road tax, an annual insurance premium — and widening a
 * stored field's meaning after screens read it is the more expensive change.
 * That is a different case from `.mvp-column--outset`, which was an unshipped
 * CSS class with no adopter: a union member costs no bytes and no render path,
 * and every reader must switch on it exhaustively either way.
 */
export type CommitmentCadence = 'monthly' | 'yearly'

/**
 * A cheaper plan Monarch has spotted for a commitment — Flow 11's smart
 * insight (`1266:14341`) and the promotion banner beneath the Internet row.
 *
 * IT STORES THE OFFER PRICE AND NOTHING ELSE ABOUT THE MONEY. The current
 * price is the COMMITMENT's own `amount`, and both savings figures derive:
 * `offerMonthlySaving` is current − offer, `offerYearlySaving` is that × 12.
 * A stored saving would be a third copy of a fact the other two already
 * state, and FIGMA ITSELF PROVES THE HAZARD — the education frame's
 * underlying insight layer prints "Save RM 51/month" beside "RM 600/year",
 * and 51 × 12 is 612, not 600.
 *
 * TEKU'S RULING, 30 SEPT 2026: the plan is RM 120 and the offer RM 70, so the
 * saving is RM 50/month and RM 600/year. `1266:14341` and `1266:14343` both
 * print exactly that. Where a frame prints RM 69 or RM 51 the FRAME is the
 * stale party and must not be reconciled back.
 *
 * THERE IS NO `title` FIELD. Both surfaces write "<provider> Promotion
 * Available" from `provider`, so renaming the provider moves both; the
 * banner's trailing period and the panel's lack of one are transcribed per
 * surface, because they are two pieces of copy rather than one fact.
 *
 * NP1: EVERY FIELD IS PLAIN SERIALISABLE DATA.
 */
export interface CommitmentOffer {
  id: string
  /** The `Commitment` this offer would replace. */
  commitmentId: string
  /** The provider being suggested — Figma's "Suggested / Maxis". */
  provider: string
  /** Positive, in MYR: what the suggested plan costs each period. */
  amount: Amount
  /** A file under `/media/promotions/`, resolved by `offerImageUrl`. */
  image: string
}

/**
 * A commitment's mark — a brand logo, or a generic icon.
 *
 * A DISCRIMINATED UNION, for the reason `TransactionLogo` is one: Figma draws
 * both kinds, and they render through DIFFERENT DS components with disjoint
 * inputs (`Logo name` out of the closed `LogoName` registry, against `Icon
 * name` out of the icon registry). Inventory §F records exactly this split —
 * "grayscale icons (Mortgage, Car Payment) and brand logos (U-Mobile,
 * Netflix)" — and a `{ logo?, icon? }` pair would admit both-set and
 * neither-set, which is the lattice of meaningless states the tag removes.
 *
 * THE `icon` CASE IS NOT A DS GAP. A mortgage has no brand mark to ship; a
 * generic glyph is the correct rendering, not a substitute for a missing one.
 *
 * THE ICON CASE CARRIES ITS OWN TINT, AND THE BRAND CASE CANNOT (Gate 76). A
 * `Logo` is artwork with its own colours and takes no tint; an `IconObject`
 * badge must be given one. Putting it on the icon member alone is the whole
 * reason this is a tagged union — a shared `tint` field would be meaningless on
 * every brand row.
 *
 * IT IS TRANSCRIBED FROM FIGMA PER ROW, NOT DERIVED FROM `category`, and that
 * was settled by measurement rather than taste. Figma paints Mortgage TEAL and
 * Car Payment GRAY (`1266:14339`), while their categories are `bills` and
 * `transport`, whose `TRANSACTION_CATEGORIES` hues are RED and LIME — so a
 * category rule contradicts the frame on both rows that exist to check it.
 * `Holding.badgeColor` is the same field for the same reason, with the same
 * note: measured from Figma, not chosen here.
 */
export type CommitmentLogo =
  | { kind: 'brand'; name: LogoName }
  | { kind: 'icon'; name: IconName; tint: IconObjectColor }

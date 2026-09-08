import type { IconName, IconObjectColor, LogoName } from '@monarch/design-system'

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
 * Who the row is with — a merchant mark, or a person.
 *
 * A DISCRIMINATED UNION rather than two optional fields, for the same reason
 * `Holding` is one: the two cases render through DIFFERENT DS components
 * (`Logo` vs `Avatar`) with disjoint inputs, so `{ logo?, initials? }` would
 * admit both-set and neither-set — two states with no meaning that every call
 * site would then have to defend against. The tag makes the render a total
 * switch instead.
 *
 * NO IMAGE ASSET IS INVOLVED. `Avatar` takes `initials`, verified against the
 * pinned `dist/components/Avatar/Avatar.d.ts`, so a person row needs no
 * photograph and `public/media/` is untouched. Inventory §F describes Figma's
 * people as avatar PHOTOGRAPHS; initials are the substitution, and they are a
 * substitution rather than a shortcut — a photograph of a fictional person is
 * product data this repo has no source for.
 *
 * THE FIELD IS STILL CALLED `logo`. The merchant case dominates (21 of 23 rows)
 * and both read sites already spell `logo`; renaming it would have widened a
 * type change into a rename across every consumer for no behavioural gain.
 */
export type TransactionLogo =
  | { kind: 'merchant'; name: LogoName }
  | { kind: 'person'; initials: string }

export interface Transaction {
  id: string
  /** Merchant display name, or the person's name. */
  merchant: string
  /** Merchant mark or person — see `TransactionLogo` (inventory §7). */
  logo: TransactionLogo
  /** Figma: the caption under the merchant — "Card Payment". */
  method: TransactionMethod
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
 * the type admits `null` because the variant exists and Gate 51's unlink action
 * needs somewhere to put the result.
 */
export interface Receipt {
  id: string
  /** The file in `public/media/receipts/`. Bare name — no path, no leading `/`. */
  filename: string
  /** What the card prints, camera-roll style. See the note above. */
  displayName: string
  /** ISO 8601 local timestamp, transcribed from the receipt's own printed date. */
  capturedAt: string
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
  currency: CurrencyCode
  lineItems: ReceiptLineItem[]
  /** `Transaction.id`, or `null` for an unlinked capture. */
  transactionId: string | null
}

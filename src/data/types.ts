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

export interface Transaction {
  id: string
  /** Merchant display name. */
  merchant: string
  /** DS `Logo` name — merchant identity carried by a component (inventory §7). */
  logo: LogoName
  /** Figma: the caption under the merchant — "Card Payment". */
  method: string
  /** Negative for an outflow. */
  amount: Amount
  currency: CurrencyCode
  /** ISO 8601 local timestamp. Formatting is `format.ts`'s job, not the data's. */
  occurredAt: string
  category: TransactionCategoryId
  /** Drives `ListItem`'s `hasReceiptIcon`. Becomes writable state in Flow 9 (W2). */
  hasReceipt: boolean
  /**
   * Which cash account the row was spent from — joins to `BankHolding.accountId`.
   *
   * Added by Flow 7 so a bank holding's drill-down can show its own rows. It is
   * an ATTRIBUTION of the existing ledger, not new transactions: no merchant,
   * amount, date or category below changed, and `categoryTotal()` is unfiltered
   * so the Groceries chain still computes RM 1,800.00 exactly as before.
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
   * ⚠️ NOT CURRENTLY REACHABLE. `CardBalance` hard-codes `IconObject
   * color="slate"` and exposes no prop for it (checked in DS source at v1.2.0),
   * so every card renders a slate badge and this field is carried but unused on
   * the overview. It is kept — not deleted — because the value is measured from
   * Figma, the drill-down hero does honour it, and deleting it would lose the
   * only record of what the design asks for. See the note in `holdings.ts`.
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

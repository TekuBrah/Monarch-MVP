import type { IconName, LogoName } from '@monarch/design-system'

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

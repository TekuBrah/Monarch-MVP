import type { IconName, LogoName, TrendDirection } from '@monarch/design-system'
import {
  fixedDepositAccrued,
  fixedDepositDates,
  fixedDepositPrincipal,
  goldValue,
  hasTrend,
  holdingChangePct,
  holdingValue,
  trendOf,
  walletHoldings,
} from '../../data/derive'
import {
  formatMyr,
  formatPercent,
  formatQuantity,
  formatSignedMyr,
  formatTimestamp,
  formatTrendPercent,
} from '../../data/format'
import { formatDate } from '../../data/today'
import type { CryptoHolding, Holding, Transaction } from '../../data/types'
import type { DetailRow } from './components/DetailRows'

/**
 * THE FIELD MAP — one holding in, one screen's worth of content out.
 *
 * This is what lets `HoldingDetailScreen` be ONE component for nine holdings
 * instead of nine screens or a pile of `field && <Row/>`. The switch below is
 * exhaustive over `Holding['type']`, so adding a tenth holding type is a
 * COMPILE ERROR here rather than a blank screen at runtime — which is the whole
 * reason `Holding` is a discriminated union.
 *
 * Every value it returns is FORMATTED AT THE EDGE and DERIVED BEFORE THAT.
 * Nothing in this file adds up an array itself; it calls `derive.ts` and hands
 * the result to `format.ts`.
 *
 * The shape mirrors what Figma's fixed-deposit screen actually draws:
 *
 *   hero    — value, and a trend ONLY for types that have market movement
 *   tiles   — `CardDataDisplay`, the wrapping tile row
 *   rows    — plain label/value pairs with rules between them
 *   list    — the type's constituent parts, where it has any
 *   actions — the bottom buttons, where the design gives the type any
 *
 * ⚠️ `rows` AND `list` ARE ALTERNATIVES, NOT A PAIR. Both idioms exist in the
 * template because the source draws both, but no single holding uses both: the
 * fixed deposit is the one type whose detail is a set of computed FIGURES
 * (current value, accrued interest, remaining tenure), and every other type's
 * detail is a set of CONSTITUENT PARTS — stocks held, funds held, tokens,
 * transactions — which is a list.
 *
 * This was got wrong first time round, and the screen said so: emitting both for
 * every type printed "Current value" three times on one screen, once in the
 * hero, once as a tile and once as a row. A figure that already has a home does
 * not get a second one.
 */

export interface HoldingTile {
  info: string
  content: string
}

export interface HoldingListEntry {
  id: string
  title: string
  /** Ticker, quantity, timestamp — whatever sits under the title. */
  titleInfo?: string
  amount: string
  amountInfo?: string
  trend?: TrendDirection
  icon?: IconName
  /** Set for crypto tokens and merchants, which have real marks; funds do not. */
  logo?: LogoName
}

export interface HoldingFields {
  hero: {
    trend?: { direction: TrendDirection; label: string }
    footnote?: string
  }
  tiles: HoldingTile[]
  rows: DetailRow[]
  list?: { label: string; entries: HoldingListEntry[] }
  actions: {
    /** Opens the maturity-reminder presets. Fixed deposits only. */
    reminder: boolean
    /** Opens the statement-period presets. Anything with a statement. */
    statement: boolean
  }
}

const NO_ACTIONS = { reminder: false, statement: false }

export function holdingFields(
  holding: Holding,
  cryptoHoldings: CryptoHolding[],
  transactions: Transaction[],
): HoldingFields {
  const value = holdingValue(holding, cryptoHoldings)

  /*
    The hero's trend, for the four types that have one. Derived from the same
    number the label formats, so the arrow and the percentage cannot disagree —
    the rule `trendOf` exists to enforce.
  */
  const changePct = holdingChangePct(holding, cryptoHoldings)
  const trend = hasTrend(holding)
    ? { direction: trendOf(changePct), label: formatTrendPercent(changePct) }
    : undefined

  /** Invested / Current value — the tile pair every market-facing type shows. */
  const investedTiles = (): HoldingTile[] => [
    { info: 'Invested', content: formatMyr(holding.invested ?? 0) },
    { info: 'Current value', content: formatMyr(value) },
  ]

  switch (holding.type) {
    case 'fixed-deposit': {
      const { start, maturity } = fixedDepositDates(holding)
      const principal = fixedDepositPrincipal(holding)
      return {
        hero: { trend, footnote: `Maturity: ${formatDate(maturity)}` },
        tiles: [
          /*
            B3 — PRINCIPAL IS DERIVED FROM VALUE, not transcribed. Figma prints
            RM 125,000, which cannot reach RM 150,000 at 3.5% over the three-year
            term the same screen states. FIX IN FIGMA; `derive.ts` documents the
            arithmetic in full.
          */
          { info: 'Principal Amount', content: formatMyr(principal) },
          { info: 'Interest Rate', content: `${formatPercent(holding.ratePct)} p.a` },
          // B5 — offsets from a live TODAY, so "15 Months" stays true.
          { info: 'Start Date', content: formatDate(start) },
          { info: 'Maturity Date', content: formatDate(maturity) },
        ],
        rows: [
          { label: 'Current Value', value: formatMyr(value) },
          // Also derived, and also contradicts Figma's RM 3,750 — same finding.
          { label: 'Accrued Interest', value: formatMyr(fixedDepositAccrued(holding)) },
          {
            label: 'Remaining Tenure',
            value: `${holding.remainingMonths} Months`,
          },
        ],
        actions: { reminder: true, statement: true },
      }
    }

    case 'bank':
    case 'joint': {
      /*
        The account's own rows, out of the ONE ledger. Not a second list: these
        are the same `Transaction` objects the Homepage draws, filtered by the
        `accountId` Flow 7 attributed. Nothing was authored to fill this screen.
      */
      const rows = transactions
        .filter((t) => t.accountId === holding.accountId)
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))

      return {
        hero: { trend, footnote: `${holding.bank} · ${holding.accountNo}` },
        tiles: [
          { info: 'Account no.', content: holding.accountNo },
          { info: 'Bank', content: holding.bank },
          { info: 'Type', content: holding.accountType },
        ],
        // No label/value rows: the hero already carries the balance, and this
        // type's detail IS its ledger.
        rows: [],
        list: {
          label: 'Recent transactions',
          entries: rows.map((t) => ({
            id: t.id,
            title: t.merchant,
            titleInfo: t.method,
            // Signed — outflows are negative in the ledger, and the sign is the
            // only thing on the row that says which way the money went.
            amount: formatSignedMyr(t.amount),
            amountInfo: formatTimestamp(t.occurredAt),
            logo: t.logo,
          })),
        },
        actions: { reminder: false, statement: true },
      }
    }

    case 'stocks':
    case 'unit-trust':
    case 'prs':
      return {
        hero: { trend },
        tiles: investedTiles(),
        // Invested and current value are both tiles; the gain between them is
        // the list's job to explain, line by line.
        rows: [],
        list: {
          label: holding.linesLabel,
          entries: holding.lines.map((line) => ({
            id: line.id,
            title: line.name,
            titleInfo: line.symbol,
            amount: formatMyr(line.valueMyr),
            amountInfo: formatTrendPercent(line.changePct),
            trend: trendOf(line.changePct),
            icon: 'icon_stocks' as IconName,
          })),
        },
        actions: NO_ACTIONS,
      }

    case 'gold':
      return {
        hero: { trend, footnote: `${holding.grams.toFixed(2)} g of gold` },
        tiles: [
          { info: 'Weight', content: `${holding.grams.toFixed(2)} g` },
          { info: 'Price / gram', content: formatMyr(holding.pricePerGram) },
          { info: 'Purchase value', content: formatMyr(holding.invested ?? 0) },
        ],
        /*
          Gold is the one holding with NEITHER rows nor a list, and that is
          faithful: a bar of gold has no constituent parts to enumerate and no
          figure the three tiles do not already state. Its gain is the only thing
          left, and it is the one row it gets — recomputed from grams x price,
          never a stored ringgit figure.
        */
        rows: [
          {
            label: 'Total gain',
            value: formatMyr(goldValue(holding) - (holding.invested ?? 0)),
          },
        ],
        // Figma authors no bottom actions for this type, so none is invented.
        actions: NO_ACTIONS,
      }

    case 'crypto-wallet': {
      const tokens = walletHoldings(cryptoHoldings, holding.walletId)
      return {
        hero: { trend },
        tiles: investedTiles(),
        // Same as the investment types — the tiles carry the figures, the token
        // list carries the detail.
        rows: [],
        list: {
          label: 'Token holdings',
          entries: tokens.map((token) => ({
            id: token.id,
            title: token.name,
            titleInfo: formatQuantity(
              token.quantity,
              token.quantityDecimals,
              token.symbol,
            ),
            amount: formatMyr(token.valueMyr),
            amountInfo: formatTrendPercent(token.changePct),
            trend: trendOf(token.changePct),
            logo: token.logo,
          })),
        },
        actions: NO_ACTIONS,
      }
    }
  }
}

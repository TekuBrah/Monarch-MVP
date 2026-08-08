import { coinPrice } from './market'
import type { CryptoHolding, CryptoWallet, FiatAccount } from './types'

/**
 * Seed accounts.
 *
 * In-memory only, resets on reload (architecture §3.2). Nothing here is
 * persisted, and nothing here is a total — totals are derived in `derive.ts`.
 */

export const FIAT_ACCOUNTS: FiatAccount[] = [
  {
    id: 'main',
    group: 'Account',
    name: 'Main',
    logo: 'flag',
    currency: 'MYR',
    // AUTHORITATIVE (inventory §6a). Reconciles against F4, F6 and F7.
    balance: 27978.59,
  },
  {
    /**
     * FLOW 7 — A DELIBERATE ADDITION, NOT A TRANSCRIPTION.
     *
     * The Joint Account is drawn in Flow 4's account picker at RM 15,000.00 and
     * appears on no Homepage or Finance screen. Flow 7 promotes it to a ninth
     * balance card because a net worth that silently omits an account the app
     * elsewhere says you have is worse than one card too many. Same disposition
     * as the Solana holding below: authored, and labelled as authored.
     */
    id: 'joint',
    group: 'Account',
    name: 'Joint Account',
    logo: 'flag',
    currency: 'MYR',
    balance: 15000,
  },
]

/**
 * ⚠️ NAMES CHANGED IN FLOW 7. These wallets were seeded as "Marge's Crypto" and
 * "Fun Tokens" from the Homepage, while the transfer screens called the first
 * "Marg's Wallet" — inventory F5 A6 logged the disagreement as FIX IN FIGMA,
 * "pick one". Flow 7's Finance Overview is the ONLY screen in the file where
 * both wallets appear side by side, and it names them `Marge's Wallet` and
 * `Fun Wallet`. That is the tiebreak, so those are the names everywhere now.
 */
export const CRYPTO_WALLETS: CryptoWallet[] = [
  { id: 'marg', name: "Marge's Wallet", logo: 'general' },
  { id: 'fun', name: 'Fun Wallet', logo: 'general' },
]

/**
 * The crypto holdings — five read from Figma, one authored, two corrected.
 *
 * WHAT CHANGED IN FLOW 7 AND WHY. Flow 1 shipped five holdings summing to
 * RM 97,236.32 against a displayed RM 102,354.02, and recorded the RM 5,117.70
 * gap as the file's own contradiction rather than padding it. Flow 7 draws both
 * wallets as separate cards for the first time, which splits that single gap
 * into two independent constraints and settles it:
 *
 *     Marge's drawn:  46,059.31 + 25,588.51 + 15,353.10 = 87,000.92
 *     Marge's required (Flow 7 card)                    = 102,354.02
 *                                             DEFICIT   =  15,353.10
 *
 *     Fun drawn:       5,117.70 + 5,117.70              =  10,235.40
 *     Fun required (Flow 7 card)                        =   5,000.00
 *                                             EXCESS    =   5,235.40
 *
 * BOTH TOTALS ARE CORROBORATED TWICE — 102,354.02 + 5,000.00 = 107,354.02,
 * which is the Assistant's "Crypto Wallets RM 107,354"; and the same two figures
 * carry the net worth to the cent. Neither is in doubt.
 *
 * FUN WALLET — both drawn values are provably wrong. If either row's
 * RM 5,117.70 were correct the other would have to be MINUS 117.70 to reach
 * 5,000.00, and a negative holding is impossible. So Flow 1's "one row was
 * pasted over the other" reading cannot survive the two-wallet split: neither
 * drawn value has authority. Both are restated to RM 2,500.00, which is the only
 * split the constraint admits without inventing a third token. The quantities
 * are KEPT as drawn, so the per-unit prices are what get implied
 * (RM 0.7414/XLM, RM 32.4044/UNI — both plausible for these tokens).
 *
 * MARGE'S WALLET — the opposite finding. No individual value is wrong: BTC and
 * ETH are cross-confirmed elsewhere, and Tether's implied RM 4.2295/USDT is a
 * correct USD/MYR rate for a dollar stablecoin. Restating Tether to close the
 * deficit would imply RM 8.459/USDT, which is not defensible, and it would make
 * one holding a plug reverse-engineered from the total — exactly what the derive
 * rule exists to prevent. The deficit is instead a MISSING SIXTH HOLDING, and it
 * is missing from the file too: `Homepage_Crypto`'s "My Tokens" section contains
 * exactly two `Item/list` instances and one empty childless leftover frame, so
 * no concealed row exists anywhere to recover.
 *
 * SOLANA IS THEREFORE AUTHORED, NOT TRANSCRIBED — the same disposition as the
 * Joint Account above. It is anchored on the file's own quoted Solana price so
 * the addition is derived rather than invented: the PRICE is the fixed point and
 * the QUANTITY falls out of it, which also means a future price feed recomputes
 * the holding instead of needing the quantity hand-adjusted.
 */

/** The deficit Solana closes — Marge's card total minus its three drawn tokens. */
const SOLANA_DEFICIT_MYR = 15353.1
/** Price is the fixed point; quantity derives from it, and value from quantity. */
const SOLANA_QUANTITY = SOLANA_DEFICIT_MYR / coinPrice('sol')

export const CRYPTO_HOLDINGS: CryptoHolding[] = [
  {
    id: 'btc',
    walletId: 'marg',
    name: 'Bitcoin',
    symbol: 'BTC',
    logo: 'bitcoin',
    quantity: 0.098279,
    quantityDecimals: 6,
    valueMyr: 46059.31,
    changePct: 10.2,
  },
  {
    id: 'eth',
    walletId: 'marg',
    name: 'Ethereum',
    symbol: 'ETH',
    logo: 'ethereum',
    quantity: 1.3786,
    quantityDecimals: 4,
    valueMyr: 25588.51,
    changePct: -2.49,
  },
  {
    id: 'usdt',
    walletId: 'marg',
    name: 'Tether',
    symbol: 'USDT',
    logo: 'tether',
    quantity: 3630,
    quantityDecimals: 2,
    valueMyr: 15353.1,
    // No move recorded in the file for this token — see CryptoHolding.changePct.
    changePct: 0,
  },
  {
    // AUTHORED — see the block comment above. Price-anchored: the quantity is a
    // function of `coinPrice('sol')`, and the value is a function of the
    // quantity, so RM 4,465.00 is written in exactly one place in this app
    // (`market.ts`) and this holding follows it.
    id: 'sol',
    walletId: 'marg',
    name: 'Solana',
    symbol: 'SOL',
    logo: 'solana',
    quantity: SOLANA_QUANTITY,
    quantityDecimals: 4,
    valueMyr: SOLANA_QUANTITY * coinPrice('sol'),
    changePct: 0,
  },
  {
    id: 'xlm',
    walletId: 'fun',
    name: 'Stellar',
    symbol: 'XLM',
    logo: 'stellar',
    quantity: 3372,
    quantityDecimals: 0,
    // CORRECTED from the drawn RM 5,117.70 — see the block comment above.
    // Implied unit price: 2,500.00 / 3,372 = RM 0.7414/XLM.
    valueMyr: 2500,
    changePct: 0,
  },
  {
    id: 'uni',
    walletId: 'fun',
    name: 'Uniswap',
    symbol: 'UNI',
    logo: 'uniswap',
    quantity: 77.15,
    quantityDecimals: 2,
    // CORRECTED from the drawn RM 5,117.70 — see the block comment above.
    // Implied unit price: 2,500.00 / 77.15 = RM 32.4044/UNI.
    valueMyr: 2500,
    changePct: 0,
  },
]

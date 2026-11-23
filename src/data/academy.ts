import type { CardFeaturesAccent, CardFeaturesVariant, IconName, IconObjectColor } from '@monarch/design-system'

/**
 * Flow 2 — Monarch Academy (Gate 109). THE ACADEMY'S CONTENT, AS DATA.
 *
 * A data-only module (R106-7, R107-7): type-only imports, no UI, no router. It is
 * a CONSTANT OUTSIDE `seedFingerprint` (like `RECIPIENTS`), so editing a label
 * here resets no tester's saved data. Colours are DS variant / accent / hue
 * NAMES, never a hex value (A20).
 *
 * Every figure the two screens print is DERIVED in `derive.ts` from data the app
 * already stores (Decisions 44, 45, 46); nothing about the Academy is stored
 * (R107-4).
 *
 * Copy follows the decisions, not the frames, where they differ — each change is
 * listed in the Gate 109 record: "Smart budgets" -> "Budgets" (49), "Safety &
 * Smart Support" -> "Safety & Support" (49), Title Case for every tile label
 * (55), "Short courses" and no leading bullet on a course line (50).
 */

/** Where an Academy control goes. `null` everywhere below means "Coming soon." */
export type AcademyDestination =
  | 'transfer'
  | 'transfer-crypto'
  | 'new-recipient'
  | 'finance-overview'
  | 'finance-transactions'
  | 'finance-budget'
  | 'finance-plans'
  | 'finance-receipts'
  | 'settings'

export interface AcademyTile {
  /** Shared with Home's three tiles (`FEATURE_CARDS` in `insights.ts`) where the
      same feature is drawn there, so Home's tile does what this one does (43). */
  id: string
  label: string
  icon: IconName
  destination: AcademyDestination | null
}

export interface AcademyTileGroup {
  id: string
  label: string
  variant: Exclude<CardFeaturesVariant, 'outline'>
  tiles: AcademyTile[]
}

/** App Guide's four tile groups, Figma `1266:14274` `Frame 503`, in drawn order.
    Destinations are Decision 42's table. */
export const ACADEMY_TILE_GROUPS: AcademyTileGroup[] = [
  {
    id: 'essentials',
    label: 'Essentials',
    variant: 'blue',
    tiles: [
      { id: 'add-money', label: 'Add Money', icon: 'icon_receive', destination: null },
      { id: 'instant-transfers', label: 'Instant Transfers', icon: 'icon_transfer', destination: 'transfer' },
      { id: 'scheduled-payments', label: 'Scheduled Payments', icon: 'icon_scheduled_payments', destination: null },
      { id: 'managing-accounts', label: 'Managing Accounts', icon: 'switch_account', destination: null },
    ],
  },
  {
    id: 'crypto-assets',
    label: 'Crypto & Assets',
    variant: 'orange',
    tiles: [
      { id: 'buy-sell-crypto', label: 'Buy and Sell Crypto', icon: 'icon_buy_and_sell_crypto', destination: null },
      { id: 'crypto-transfers', label: 'Crypto Transfers', icon: 'icon_crypto_transfers', destination: 'transfer-crypto' },
      { id: 'stocks', label: 'Buy and Sell Stocks', icon: 'icon_stocks', destination: null },
      { id: 'monitor-assets', label: 'Monitor Asset Performance', icon: 'assessment', destination: 'finance-overview' },
    ],
  },
  {
    id: 'plan-manage',
    label: 'Plan & Manage',
    variant: 'green',
    tiles: [
      { id: 'track-spending', label: 'Track Spending', icon: 'icon_track_spending', destination: 'finance-transactions' },
      { id: 'budgets', label: 'Budgets', icon: 'icon_budget', destination: 'finance-budget' },
      { id: 'savings-goals', label: 'Savings Goals', icon: 'flag', destination: 'finance-plans' },
      { id: 'automated-savings', label: 'Automated Savings', icon: 'icon_automatic_savings', destination: 'finance-plans' },
    ],
  },
  {
    id: 'safety-support',
    label: 'Safety & Support',
    variant: 'purple',
    tiles: [
      { id: 'fraud-protection', label: 'Fraud Protection', icon: 'security', destination: null },
      { id: 'smart-insights', label: 'Smart Insights', icon: 'icon_aiinsights', destination: null },
      { id: 'spending-alerts', label: 'Spending Alerts', icon: 'icon_spending_alert', destination: null },
      { id: 'account-controls', label: 'Account Controls', icon: 'manage_accounts', destination: 'settings' },
    ],
  },
]

/** Every App Guide tile, flat. */
export const ACADEMY_TILES: AcademyTile[] = ACADEMY_TILE_GROUPS.flatMap((g) => g.tiles)

/* ── Essential Tasks (Decision 46) ───────────────────────────────────────── */

export type EssentialTaskId =
  | 'transfer'
  | 'recipient'
  | 'budget'
  | 'auto-save'
  | 'receipt'
  | 'recategorise'

export interface EssentialTask {
  id: EssentialTaskId
  title: string
  destination: AcademyDestination
}

/** The six tasks, in Decision 46's order. Whether each is done is DERIVED
    (`essentialTasks` in `derive.ts`), never stored. */
export const ESSENTIAL_TASKS: EssentialTask[] = [
  { id: 'transfer', title: 'Make a transfer', destination: 'transfer' },
  { id: 'recipient', title: 'Add a recipient', destination: 'new-recipient' },
  { id: 'budget', title: 'Set a budget', destination: 'finance-budget' },
  { id: 'auto-save', title: 'Turn on auto-save for a goal', destination: 'finance-plans' },
  { id: 'receipt', title: 'Capture a receipt', destination: 'finance-receipts' },
  { id: 'recategorise', title: 'Recategorise a transaction', destination: 'finance-transactions' },
]

/** The card's title once all six are done (46). */
export const ESSENTIALS_COMPLETE = 'Essentials complete'

/* ── Levels (Decision 45) ────────────────────────────────────────────────── */

export interface AcademyLevel {
  level: number
  name: string
  /** The fewest tasks done that reach this level. */
  minDone: number
}

/** Ascending by `minDone`. 0–1 done -> Lv1, 2–3 -> Lv2, 4–5 -> Lv3, 6 -> Lv4. */
export const ACADEMY_LEVELS: AcademyLevel[] = [
  { level: 1, name: 'Getting Started', minDone: 0 },
  { level: 2, name: 'Explorer', minDone: 2 },
  { level: 3, name: 'Pro User', minDone: 4 },
  { level: 4, name: 'Monarch Master', minDone: 6 },
]

/* ── Wealth Wisdom (Decisions 44, 49, 50; R107-2) ────────────────────────── */

export type AcademyCategoryId = 'investing' | 'crypto' | 'taxes' | 'retirement'
export type AcademyChipId = 'all' | AcademyCategoryId

export interface AcademyChip {
  id: AcademyChipId
  label: string
}

/** Figma `Frame 422`, drawn order. "All" is the default. */
export const ACADEMY_CHIPS: AcademyChip[] = [
  { id: 'all', label: 'All' },
  { id: 'investing', label: 'Investing' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'taxes', label: 'Taxes' },
  { id: 'retirement', label: 'Retirement' },
]

/** A Wealth Wisdom item a chip can filter. `category: null` shows under "All"
    only — the item belongs to none of the four topics. */
export interface AcademyCategorised {
  id: string
  category: AcademyCategoryId | null
}

/** The three "Start here" tiles (outline, kicker + accent; R108-7). "+100XP" is
    not shown (Decision 47). */
export interface AcademyStartTile extends AcademyCategorised {
  kicker: string
  title: string
  accent: CardFeaturesAccent
  icon: IconName
}

export const ACADEMY_START_TILES: AcademyStartTile[] = [
  { id: 'inflation', kicker: 'Daily wisdom', title: 'Inflation?', accent: 'cyan', icon: 'tips_and_updates', category: 'investing' },
  { id: 'diversification', kicker: 'Quiz', title: 'Diversification', accent: 'orange', icon: 'emoji_events', category: 'investing' },
  { id: 'ways-to-save', kicker: 'Video Tip', title: '3 ways to save', accent: 'red', icon: 'smart_display', category: null },
]

/** The three short courses (Figma `list/chart legend`, R108-9). */
export interface AcademyCourse extends AcademyCategorised {
  title: string
  meta: string
  icon: IconName
  iconColor: IconObjectColor
}

export const ACADEMY_COURSES: AcademyCourse[] = [
  { id: 'investing-101', title: 'Investing 101: Build portfolio', meta: '6 Modules • 15 min', icon: 'icon_stocks', iconColor: 'green', category: 'investing' },
  { id: 'retirement-planning', title: 'Retirement planning: Start early', meta: '3 Modules • 10 min', icon: 'icon_bank', iconColor: 'blue', category: 'retirement' },
  { id: 'crypto-risks', title: 'Crypto: Risks & Opportunities', meta: '4 Modules • 12 min', icon: 'icon_crypto', iconColor: 'orange', category: 'crypto' },
]

/**
 * The first name "Start here, {first name}" prints (Decision 49).
 *
 * THE APP HOLDS NO PROFILE RECORD. The same literal is written in
 * `HomepageScreen.tsx` ("Hi, Margaret", `avatarName`) and `FinanceScreen.tsx`
 * (`avatarName`). Consolidating the three into one profile constant is a fork in
 * the Gate 109 record, not done here.
 */
export const ACADEMY_FIRST_NAME = 'Margaret'

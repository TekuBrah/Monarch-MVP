import { TRANSACTION_CATEGORIES } from '../data/transactions'
import type {
  Budget,
  FiatAccount,
  Goal,
  Receipt,
  ReceiptLineItem,
  Transaction,
  TransactionLogo,
} from '../data/types'
import type { CaptureSource } from './captureFacts'

/**
 * ─────────────────── THE STORED SHAPE — Gate 85 ───────────────────
 *
 * What the database holds, as distinct from what the app holds at runtime.
 * The two differ in exactly three places, all images, and the storage boundary
 * (`boundary.ts`) is the only code that maps between them (D-11):
 *
 *   runtime `Receipt.sourceUrl`                 -> stored `StoredReceipt.imageId`
 *   runtime `Goal.image` when origin 'upload'   -> stored image id in the same field
 *   runtime goal logo `filename` when 'upload'  -> stored image id in the same field
 *
 * plus two capture facts that live beside the runtime receipt and on the
 * stored one (D-10). Every other field is stored exactly as the runtime holds
 * it — nothing derived is ever stored.
 *
 * SCHEMA VERSION 1 IS THE FIRST. A later shape change bumps it and adds a step
 * to `MIGRATIONS`; a stored version with no migration path is quarantined, not
 * silently reset (D-5, amended).
 *
 * VERSION 2 — Gate 93 (Flow 4): `Transaction.recipientId?`, set on a row
 * `sendMoney` writes. An identity step (`MIGRATIONS[1]`), because a v1 row is
 * a valid v2 row with no recipient. `DB_VERSION` (`store.ts`, the IndexedDB
 * version) does NOT move: the object stores are unchanged, and the harness
 * parses that value.
 */

export const SCHEMA_VERSION = 2

export interface StoredReceipt extends Omit<Receipt, 'sourceUrl'> {
  /** The image's id in the `images` store, present exactly for a capture. */
  imageId?: string
  /** D-10. Absent for a seeded receipt; absent means "not recorded". */
  captureSource?: CaptureSource
  /** D-10. Absent means `true` — every seeded receipt's date was transcribed. */
  capturedAtRead?: boolean
}

export interface StoredRecords {
  transactions: Transaction[]
  receipts: StoredReceipt[]
  fiatAccounts: FiatAccount[]
  goals: Goal[]
  budgets: Budget[]
}

export interface StoredMeta {
  schemaVersion: number
  /** `seedFingerprint()` of the seed the stored data grew from (ruling 1). */
  seedFingerprint: string
  /** Increments on every committed write; the multi-tab guard compares it (D-12). */
  revision: number
}

export const RECORD_KEYS = ['transactions', 'receipts', 'fiatAccounts', 'goals', 'budgets'] as const
export type RecordKey = (typeof RECORD_KEYS)[number]

// ───────────────────────────── the validators ─────────────────────────────
//
// TOTAL: each takes `unknown`, never throws, and answers true only for a value
// it is safe to render. A stored record that passes is as safe as the seed; one
// that fails would otherwise reach a derivation that throws during render, and
// there is no error boundary in `src/`. `e2e/persistence.spec.ts` runs every
// seed record through them, and breaks every checked field in turn.

type Rec = Record<string, unknown>

const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === 'string'
const isNonEmptyStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isBool = (v: unknown): v is boolean => typeof v === 'boolean'
const isInt = (v: unknown): v is number => Number.isInteger(v)
const oneOf =
  <T extends string>(...values: readonly T[]) =>
  (v: unknown): v is T =>
    typeof v === 'string' && (values as readonly string[]).includes(v)
const optional =
  (check: (v: unknown) => boolean) =>
  (v: unknown): boolean =>
    v === undefined || check(v)

/** `YYYY-MM-DD` — budget periods and goal target dates. */
const isDate = (v: unknown): boolean => isStr(v) && /^\d{4}-\d{2}-\d{2}$/.test(v)
/** Zone-less local wall clock, to the minute, second or millisecond. */
const isTimestamp = (v: unknown): boolean =>
  isStr(v) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?$/.test(v)

const isCategory = oneOf(...TRANSACTION_CATEGORIES.map((c) => c.id))
const isCurrency = oneOf('MYR')
const isImageOrigin = oneOf('ai', 'placeholder', 'upload')
const isSource = oneOf('camera', 'gallery')

function isLogo(v: unknown): v is TransactionLogo {
  if (!isRec(v)) return false
  switch (v.kind) {
    case 'merchant':
      return isNonEmptyStr(v.name)
    case 'person':
      return isStr(v.initials)
    case 'image':
      return isNonEmptyStr(v.filename)
    case 'goal':
      return isNonEmptyStr(v.filename) && isImageOrigin(v.origin)
    default:
      return false
  }
}

export function isStoredTransaction(v: unknown): boolean {
  return (
    isRec(v) &&
    isNonEmptyStr(v.id) &&
    isStr(v.merchant) &&
    isLogo(v.logo) &&
    oneOf('Card Payment', 'Fund Transfer', 'Crypto Transfer')(v.method) &&
    oneOf('payment', 'transfer')(v.kind) &&
    isNum(v.amount) &&
    isCurrency(v.currency) &&
    isTimestamp(v.occurredAt) &&
    isCategory(v.category) &&
    optional(isNonEmptyStr)(v.goalId) &&
    optional(oneOf('automatic', 'manual'))(v.contributionSource) &&
    optional(isNonEmptyStr)(v.reference) &&
    isNonEmptyStr(v.accountId) &&
    // Gate 93, schema v2: the recipient a send went to.
    optional(isNonEmptyStr)(v.recipientId)
  )
}

function isLineItem(v: unknown): v is ReceiptLineItem {
  return isRec(v) && isStr(v.name) && isStr(v.quantity) && isNum(v.price)
}

export function isStoredReceipt(v: unknown): boolean {
  return (
    isRec(v) &&
    isNonEmptyStr(v.id) &&
    isStr(v.filename) &&
    // A stored object URL would be dead on the next load — never accepted.
    !('sourceUrl' in v) &&
    optional(isNonEmptyStr)(v.imageId) &&
    isStr(v.displayName) &&
    isTimestamp(v.capturedAt) &&
    // Required in storage: `receiptsNewestFirst` throws on a missing one, and
    // every path that makes a receipt (and the seed backfill) stamps it.
    isTimestamp(v.addedAt) &&
    isStr(v.merchant) &&
    isNum(v.total) &&
    (v.tax === null || isNum(v.tax)) &&
    isCurrency(v.currency) &&
    Array.isArray(v.lineItems) &&
    v.lineItems.every(isLineItem) &&
    (v.transactionId === null || isNonEmptyStr(v.transactionId)) &&
    optional(isSource)(v.captureSource) &&
    optional(isBool)(v.capturedAtRead)
  )
}

export function isStoredFiatAccount(v: unknown): boolean {
  return (
    isRec(v) &&
    isNonEmptyStr(v.id) &&
    isStr(v.group) &&
    isStr(v.name) &&
    isNonEmptyStr(v.logo) &&
    isCurrency(v.currency) &&
    isNum(v.balance)
  )
}

export function isStoredGoal(v: unknown): boolean {
  return (
    isRec(v) &&
    isNonEmptyStr(v.id) &&
    isStr(v.name) &&
    isNum(v.targetAmount) &&
    isNum(v.savedAmount) &&
    isDate(v.targetDate) &&
    isNonEmptyStr(v.image) &&
    isImageOrigin(v.imageOrigin) &&
    isNonEmptyStr(v.fundingAccountId) &&
    isRec(v.autoSave) &&
    isBool(v.autoSave.isEnabled) &&
    isNum(v.autoSave.amount)
  )
}

export function isStoredBudget(v: unknown): boolean {
  return (
    isRec(v) &&
    isNonEmptyStr(v.id) &&
    isStr(v.name) &&
    Array.isArray(v.categories) &&
    v.categories.length > 0 &&
    v.categories.every(isCategory) &&
    isNum(v.limit) &&
    isDate(v.from) &&
    isDate(v.to) &&
    isBool(v.autoRenew)
  )
}

export function isStoredMeta(v: unknown): v is StoredMeta {
  return (
    isRec(v) &&
    isInt(v.schemaVersion) &&
    (v.schemaVersion as number) >= 0 &&
    isNonEmptyStr(v.seedFingerprint) &&
    isInt(v.revision) &&
    (v.revision as number) >= 0
  )
}

const RECORD_VALIDATORS: Record<RecordKey, (v: unknown) => boolean> = {
  transactions: isStoredTransaction,
  receipts: isStoredReceipt,
  fiatAccounts: isStoredFiatAccount,
  goals: isStoredGoal,
  budgets: isStoredBudget,
}

const isArrayOf = (check: (v: unknown) => boolean) => (v: unknown) =>
  Array.isArray(v) && v.every((item) => check(item))

/**
 * The whole stored snapshot: every collection present and valid, at least one
 * cash account (`primaryAccount` throws on none), and every image id a record
 * names actually present in `imageIds`. Returns the first problem, or `null`.
 */
export function storedRecordsProblem(
  records: Partial<Record<RecordKey, unknown>>,
  imageIds: ReadonlySet<string>,
): string | null {
  // TOTAL like the record validators: a snapshot that is not even an object is a
  // problem to report, never an exception (found by the hostile-input test).
  if (!isRec(records)) return 'the snapshot is not an object'
  for (const key of RECORD_KEYS) {
    if (!isArrayOf(RECORD_VALIDATORS[key])(records[key])) return `${key} is missing or invalid`
  }
  const stored = records as StoredRecords
  if (stored.fiatAccounts.length === 0) return 'no cash account'
  for (const id of referencedImageIds(stored)) {
    if (!imageIds.has(id)) return `image ${id} is referenced but has no bytes`
  }
  return null
}

/** Every image id a stored snapshot names. */
export function referencedImageIds(records: StoredRecords): Set<string> {
  const ids = new Set<string>()
  for (const r of records.receipts) if (r.imageId !== undefined) ids.add(r.imageId)
  for (const g of records.goals) if (g.imageOrigin === 'upload') ids.add(g.image)
  for (const t of records.transactions) {
    if (t.logo.kind === 'goal' && t.logo.origin === 'upload') ids.add(t.logo.filename)
  }
  return ids
}

// ───────────────────────────── migrations ─────────────────────────────

/**
 * `MIGRATIONS[n]` turns a version-`n` snapshot into version `n + 1`. A stored
 * version below `SCHEMA_VERSION` with a missing step is QUARANTINED and the app
 * starts from the seed (D-5, amended) — never reset silently.
 *
 * 1 -> 2 (Gate 93) IS THE IDENTITY. Version 2 adds one OPTIONAL field,
 * `Transaction.recipientId`, and a v1 snapshot is a valid v2 snapshot that
 * simply carries none. The step still has to EXIST: without it a v1 store has no
 * path and is quarantined. The hydrated snapshot classifies `migrated` and is
 * written whole on the next commit (`store.ts`).
 */
export const MIGRATIONS: Record<number, (records: unknown) => unknown> = {
  1: (records) => records,
}

// ───────────────────────────── the fingerprint ─────────────────────────────

/**
 * Canonical JSON: object keys sorted at every depth, `undefined` dropped (as
 * `JSON.stringify` drops it). Two values that mean the same thing serialise
 * identically whatever order their keys were written in.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v ?? null)).join(',')}]`
  const rec = value as Rec
  const keys = Object.keys(rec)
    .filter((k) => rec[k] !== undefined)
    .sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(rec[k])}`).join(',')}}`
}

/**
 * cyrb53 — a well-known, public-domain, NON-cryptographic 53-bit string hash.
 * Change detection, not security: nobody is trying to forge a seed.
 */
function cyrb53(text: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}

/** The fingerprint of a canonicalised value, as 14 hex digits. */
export function fingerprintOf(value: unknown): string {
  return cyrb53(canonicalJson(value)).toString(16).padStart(14, '0')
}

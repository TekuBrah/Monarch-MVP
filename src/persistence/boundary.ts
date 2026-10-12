import type { Goal, Receipt, Transaction } from '../data/types'
import {
  captureFactsOf,
  clearCaptureFacts,
  restoreCaptureFacts,
} from './captureFacts'
import { imageIdForUrl, imageUrlForId, restoreImage } from './images'
import type { StoredReceipt, StoredRecords } from './schema'
import type { AppState } from './seed'

/**
 * ─────────────── THE STORAGE BOUNDARY — Gate 85 (D-11, amended) ───────────────
 *
 * The ONLY place a runtime record becomes a stored one and back. Screens,
 * providers and the runtime types never see the stored shape; the database
 * never sees an object URL.
 *
 * Three image fields swap names here (see `images.ts` for why), and two
 * capture facts move between the runtime side table (`captureFacts.ts`) and the
 * stored receipt. Everything else passes through untouched — the same objects,
 * not copies, so a record that did not change keeps its identity.
 */

/** Thrown when a runtime record names an in-memory image the registry never saw. */
export class UnregisteredImageError extends Error {}

function imageIdFor(url: string): string {
  const id = imageIdForUrl(url)
  if (id === undefined) throw new UnregisteredImageError(`no image is registered for ${url}`)
  return id
}

function storeReceipt(receipt: Receipt): StoredReceipt {
  const { sourceUrl, ...rest } = receipt
  const facts = captureFactsOf(receipt.id)
  if (sourceUrl === undefined && facts.captureSource === undefined && facts.capturedAtRead === undefined) {
    return rest
  }
  return {
    ...rest,
    ...(sourceUrl === undefined ? {} : { imageId: imageIdFor(sourceUrl) }),
    ...facts,
  }
}

function storeGoal(goal: Goal): Goal {
  return goal.imageOrigin === 'upload' ? { ...goal, image: imageIdFor(goal.image) } : goal
}

function storeTransaction(t: Transaction): Transaction {
  const { logo } = t
  return logo.kind === 'goal' && logo.origin === 'upload'
    ? { ...t, logo: { ...logo, filename: imageIdFor(logo.filename) } }
    : t
}

/** Runtime -> stored. Throws `UnregisteredImageError` rather than store a dead URL. */
export function toStored(state: AppState): StoredRecords {
  return {
    transactions: state.transactions.map(storeTransaction),
    receipts: state.receipts.map(storeReceipt),
    fiatAccounts: state.fiatAccounts,
    goals: state.goals.map(storeGoal),
    budgets: state.budgets,
  }
}

/** Every object URL a runtime snapshot renders from the registry. */
export function referencedImageUrls(state: AppState): Set<string> {
  const urls = new Set<string>()
  for (const r of state.receipts) if (r.sourceUrl !== undefined) urls.add(r.sourceUrl)
  for (const g of state.goals) if (g.imageOrigin === 'upload') urls.add(g.image)
  for (const t of state.transactions) {
    if (t.logo.kind === 'goal' && t.logo.origin === 'upload') urls.add(t.logo.filename)
  }
  return urls
}

function urlFor(id: string, images: ReadonlyMap<string, Blob>): string {
  const blob = images.get(id)
  // Unreachable after validation (`storedRecordsProblem` checks every id).
  if (blob === undefined) return imageUrlForId(id) ?? id
  return restoreImage(id, blob)
}

/**
 * Stored -> runtime, given the stored bytes. Restores the registry and the
 * capture facts as a side effect; call it only on a validated snapshot.
 */
export function fromStored(records: StoredRecords, images: ReadonlyMap<string, Blob>): AppState {
  clearCaptureFacts()
  const receipts = records.receipts.map((stored): Receipt => {
    const { imageId, captureSource, capturedAtRead, ...rest } = stored
    restoreCaptureFacts(stored.id, { captureSource, capturedAtRead })
    return imageId === undefined ? rest : { ...rest, sourceUrl: urlFor(imageId, images) }
  })
  const goals = records.goals.map((g) =>
    g.imageOrigin === 'upload' ? { ...g, image: urlFor(g.image, images) } : g,
  )
  const transactions = records.transactions.map((t) =>
    t.logo.kind === 'goal' && t.logo.origin === 'upload'
      ? { ...t, logo: { ...t.logo, filename: urlFor(t.logo.filename, images) } }
      : t,
  )
  return {
    transactions,
    receipts,
    fiatAccounts: records.fiatAccounts,
    goals,
    budgets: records.budgets,
  }
}

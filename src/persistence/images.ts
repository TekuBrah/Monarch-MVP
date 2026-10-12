/**
 * ─────────────────── THE IMAGE REGISTRY — Gate 85 (D-8) ───────────────────
 *
 * The bytes behind every in-memory image the app shows: a captured receipt's
 * photograph or PDF, and an uploaded goal image. Each is known by two names:
 *
 *   - its OBJECT URL (`blob:…`), which is what the runtime records hold and
 *     what every `<img>` renders — unchanged from before this gate;
 *   - its IMAGE ID (`img-<uuid>`), which is what the STORED records hold and
 *     what keys the bytes in the database's `images` store.
 *
 * An object URL dies with the document that made it, so it can never be
 * stored. The storage boundary (`boundary.ts`) swaps one name for the other in
 * each direction; this module is the table it reads.
 *
 * ── WHY ADOPTION, NOT RE-CREATION ──
 *
 * A capture already has an object URL by the time it becomes a receipt (the
 * staged tile's, or the detail sheet's). The registry ADOPTS that URL with the
 * `File` it came from rather than minting a second one, so the receipt renders
 * the very URL it rendered before this gate and nothing on screen changes.
 * Reading the bytes back with `fetch(blobUrl)` was measured and rejected: a
 * fetch of an already-revoked URL raises a failed request and a console error,
 * which the route walk treats as a page defect.
 *
 * ── LIFETIME (closes lineage-map D15) ──
 *
 * An entry is RELEASED — its URL revoked and its bytes dropped — when a
 * committed snapshot no longer references it. It becomes releasable only once
 * some snapshot HAS referenced it (`markReferenced`): a capture is adopted a
 * moment before the provider commits the receipt that names it, and a write
 * already in flight must not revoke it in that gap.
 * Receipt URLs are still also revoked at once by `deleteReceipt` and
 * `replaceReceipt`; revoking twice is a no-op.
 */

interface Entry {
  id: string
  url: string
  blob: Blob
  /** True once a committed snapshot has referenced it. */
  seen: boolean
}

const byUrl = new Map<string, Entry>()
const byId = new Map<string, Entry>()

function add(entry: Entry): Entry {
  byUrl.set(entry.url, entry)
  byId.set(entry.id, entry)
  return entry
}

/** Record an object URL the app already made, with the bytes behind it. */
export function adoptImage(url: string, blob: Blob): void {
  if (byUrl.has(url)) return
  add({ id: `img-${crypto.randomUUID()}`, url, blob, seen: false })
}

/** Make an object URL for new bytes and record it. Returns the URL to render. */
export function registerImage(blob: Blob): string {
  const url = URL.createObjectURL(blob)
  adoptImage(url, blob)
  return url
}

/** Hydration's half: bytes read from the store get a fresh URL under their stored id. */
export function restoreImage(id: string, blob: Blob): string {
  const existing = byId.get(id)
  if (existing) return existing.url
  // Restored bytes are referenced by the snapshot that named them.
  return add({ id, url: URL.createObjectURL(blob), blob, seen: true }).url
}

export function imageIdForUrl(url: string): string | undefined {
  return byUrl.get(url)?.id
}

export function imageUrlForId(id: string): string | undefined {
  return byId.get(id)?.url
}

export function imageBlob(id: string): Blob | undefined {
  return byId.get(id)?.blob
}

/** A committed snapshot references these URLs; they become releasable later. */
export function markReferenced(referencedUrls: ReadonlySet<string>): void {
  for (const url of referencedUrls) {
    const entry = byUrl.get(url)
    if (entry) entry.seen = true
  }
}

/**
 * Release every entry a snapshot has referenced before whose URL the committed
 * snapshot `referencedUrls` no longer names. Returns the released ids.
 */
export function releaseUnreferenced(referencedUrls: ReadonlySet<string>): string[] {
  const released: string[] = []
  for (const entry of [...byId.values()]) {
    if (!entry.seen || referencedUrls.has(entry.url)) continue
    URL.revokeObjectURL(entry.url)
    byId.delete(entry.id)
    byUrl.delete(entry.url)
    released.push(entry.id)
  }
  return released
}

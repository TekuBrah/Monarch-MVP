import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { useEffect } from 'react'
import { fromStored, referencedImageUrls, toStored } from './boundary'
import { clearCaptureFacts } from './captureFacts'
import { logPersistence } from './diagnostics'
import { imageBlob, markReferenced, releaseUnreferenced } from './images'
import {
  MIGRATIONS,
  RECORD_KEYS,
  SCHEMA_VERSION,
  isStoredMeta,
  referencedImageIds,
  storedRecordsProblem,
  type RecordKey,
  type StoredMeta,
  type StoredRecords,
} from './schema'
import { seedFingerprint, seedState, type AppState } from './seed'

/**
 * ─────────────────────────── THE STORE — Gate 85 ───────────────────────────
 *
 * Testers close and reopen the MVP and keep their data. This module is the
 * storage layer behind `AccountsProvider` and `BudgetsProvider`; screens and
 * the runtime types do not know it exists.
 *
 * ── THE SHAPE, IN ONE PARAGRAPH ──
 *
 * IndexedDB (through `idb`), one database of our own. `hydrate()` reads it
 * BEFORE React renders, so the first frame is already the stored state — no
 * flash of seed data, and a deep link to a user-created id resolves instead of
 * hitting an unknown-id redirect. After every commit that changes a persisted
 * atom, the providers report their atoms (`usePersistence`) and ONE queued
 * write stores the whole of every changed collection, the image bytes it newly
 * references, and the metadata, in ONE `strict` transaction. Persistence never
 * runs inside a state updater and never changes a writer: it observes committed
 * state, so a Top-Up's three sibling updates — committed together — are stored
 * together, and a reopen can show the state before it or after it, never
 * between.
 *
 * ── WHAT IS NEVER STORED ──
 *
 * Anything derived (net worth, holdings, dispositions, budget and goal
 * figures, anchors, chips), the theme (a preference — the settings-modal gate
 * persists it), UI state, and object URLs (`boundary.ts` swaps them for image
 * ids).
 *
 * ── THE DATABASE IS NOT tesseract.js's ──
 *
 * The OCR worker caches its language model through `idb-keyval`'s default
 * database, `keyval-store`. This one is `monarch-mvp`, and nothing here ever
 * opens, clears or deletes another database.
 */

export const DB_NAME = 'monarch-mvp'
const DB_VERSION = 1
/** D-14: a blocked or hung open falls back to memory after this long. */
export const OPEN_TIMEOUT_MS = 4000
const CHANNEL_NAME = 'monarch-mvp-store'

interface MonarchDB extends DBSchema {
  /** `meta` plus one key per collection, each holding the WHOLE collection (D-4). */
  records: { key: string; value: unknown }
  /** Image bytes keyed `img-<uuid>` (D-8). */
  images: { key: string; value: Blob }
  /** ONE slot, `latest`, overwritten: the last snapshot that could not be read (D-6). */
  quarantine: { key: string; value: unknown }
}

/**
 * `persist` — reading and writing.
 * `memory`  — no usable store (unavailable, failed, timed out, a write failed):
 *             the app works and nothing is kept.
 * `readonly`— the store holds data from NEWER code than this tab: it is left
 *             untouched and this tab never writes (D-5).
 */
export type StoreMode = 'persist' | 'memory' | 'readonly'

let mode: StoreMode = 'memory'
let db: IDBPDatabase<MonarchDB> | null = null
let channel: BroadcastChannel | null = null
let hydrated: AppState | null = null

/** The revision this tab last read or wrote; the multi-tab guard (D-12). */
let baseRevision = 0
/** Whether the store holds a full snapshot. The first write writes everything. */
let storeHasSnapshot = false
/** A migrated snapshot or a reset must be written whole next time. */
let pendingFull = false

/** The newest committed value of every atom, as the providers report it. */
let latest: Partial<AppState> = {}
/** What the store holds (or, in memory mode, what was last accounted for). */
let lastPersisted: Partial<AppState> = {}

const appliers = new Set<(state: AppState) => void>()
let queue: Promise<void> = Promise.resolve()
let scheduled = false

// ───────────────────────────────── small helpers ─────────────────────────────

function describe(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error)
}

/** A request promise nobody awaits must still never reject unhandled. */
function quiet(promise: Promise<unknown>): void {
  promise.catch(() => {})
}

/** Gate 87: the settings screen disables Reset outside `persist`, reactively. */
const modeListeners = new Set<() => void>()

function setMode(next: StoreMode): void {
  mode = next
  // THE READINESS SIGNAL (D-2) — set before the first render and kept current.
  // It is not painted; the harness waits for it.
  document.getElementById('root')?.setAttribute('data-store', next)
  for (const listener of modeListeners) listener()
}

function enqueue(task: () => Promise<void>): Promise<void> {
  const run = queue.then(task)
  queue = run.catch((error) => logPersistence('write-failed', describe(error)))
  return run
}

function isComplete(state: Partial<AppState>): state is AppState {
  return RECORD_KEYS.every((key) => state[key] !== undefined)
}

function markPersisted(state: AppState): void {
  for (const key of RECORD_KEYS) lastPersisted[key] = state[key] as never
}

// ───────────────────────────────── opening ───────────────────────────────────

function openWithTimeout(): Promise<IDBPDatabase<MonarchDB> | null> {
  if (typeof indexedDB === 'undefined') {
    logPersistence('unavailable')
    return Promise.resolve(null)
  }
  return new Promise((resolve) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      logPersistence('open-timeout', `${OPEN_TIMEOUT_MS} ms`)
      resolve(null)
    }, OPEN_TIMEOUT_MS)
    let opening: Promise<IDBPDatabase<MonarchDB>>
    try {
      opening = openDB<MonarchDB>(DB_NAME, DB_VERSION, {
        upgrade(database) {
          database.createObjectStore('records')
          database.createObjectStore('images')
          database.createObjectStore('quarantine')
        },
        // Another tab is upgrading the database: it is newer code. Step aside.
        blocking() {
          db?.close()
          db = null
          logPersistence('blocked', 'another tab is upgrading the database')
          setMode('readonly')
        },
        terminated() {
          db = null
          logPersistence('open-failed', 'the browser closed the connection')
          setMode('memory')
        },
      })
    } catch (error) {
      clearTimeout(timer)
      settled = true
      logPersistence('open-failed', describe(error))
      resolve(null)
      return
    }
    opening.then(
      (database) => {
        clearTimeout(timer)
        if (settled) {
          database.close()
          return
        }
        settled = true
        resolve(database)
      },
      (error) => {
        clearTimeout(timer)
        if (settled) return
        settled = true
        logPersistence('open-failed', describe(error))
        resolve(null)
      },
    )
  })
}

// ───────────────────────────────── reading ───────────────────────────────────

interface RawSnapshot {
  meta: unknown
  records: Partial<Record<RecordKey, unknown>>
  hasRecords: boolean
  images: Map<string, Blob>
}

async function readRaw(database: IDBPDatabase<MonarchDB>): Promise<RawSnapshot> {
  const tx = database.transaction(['records', 'images'], 'readonly')
  const recordStore = tx.objectStore('records')
  const imageStore = tx.objectStore('images')
  const [keys, values, imageKeys, imageValues] = await Promise.all([
    recordStore.getAllKeys(),
    recordStore.getAll(),
    imageStore.getAllKeys(),
    imageStore.getAll(),
  ])
  await tx.done
  const byKey = new Map(keys.map((key, i) => [key, values[i]]))
  const records: Partial<Record<RecordKey, unknown>> = {}
  for (const key of RECORD_KEYS) if (byKey.has(key)) records[key] = byKey.get(key)
  return {
    meta: byKey.get('meta'),
    records,
    hasRecords: keys.some((key) => key !== 'meta'),
    images: new Map(imageKeys.map((key, i) => [key, imageValues[i]])),
  }
}

type Classified =
  | { kind: 'empty' }
  | { kind: 'ok'; meta: StoredMeta; records: StoredRecords; migrated: boolean }
  | { kind: 'newer'; meta: StoredMeta }
  | { kind: 'seed-changed' }
  | { kind: 'quarantine'; reason: string }

function classify(raw: RawSnapshot): Classified {
  if (raw.meta === undefined && !raw.hasRecords) return { kind: 'empty' }
  if (!isStoredMeta(raw.meta)) return { kind: 'quarantine', reason: 'metadata missing or invalid' }
  const meta = raw.meta
  if (meta.schemaVersion > SCHEMA_VERSION) return { kind: 'newer', meta }
  // RULING 1: an edited seed replaces stored data. Intentional, so NOT quarantined.
  if (meta.seedFingerprint !== seedFingerprint()) return { kind: 'seed-changed' }

  let records: unknown = raw.records
  let version = meta.schemaVersion
  while (version < SCHEMA_VERSION) {
    const step = MIGRATIONS[version]
    if (step === undefined) {
      return { kind: 'quarantine', reason: `no migration from schema ${version}` }
    }
    try {
      records = step(records)
    } catch (error) {
      return { kind: 'quarantine', reason: `migration from ${version} failed: ${describe(error)}` }
    }
    version += 1
  }
  const problem = storedRecordsProblem(
    records as Partial<Record<RecordKey, unknown>>,
    new Set(raw.images.keys()),
  )
  if (problem !== null) return { kind: 'quarantine', reason: problem }
  return {
    kind: 'ok',
    meta,
    records: records as StoredRecords,
    migrated: meta.schemaVersion !== SCHEMA_VERSION,
  }
}

/** Empty the store, keeping (when quarantining) the raw snapshot in the one slot. */
async function clearStore(
  database: IDBPDatabase<MonarchDB>,
  quarantine: { reason: string; raw: RawSnapshot } | null,
): Promise<void> {
  const tx = database.transaction(['records', 'images', 'quarantine'], 'readwrite', {
    durability: 'strict',
  })
  quiet(tx.done)
  if (quarantine) {
    quiet(
      tx.objectStore('quarantine').put(
        {
          at: Date.now(),
          reason: quarantine.reason,
          meta: quarantine.raw.meta,
          records: quarantine.raw.records,
          imageIds: [...quarantine.raw.images.keys()],
        },
        'latest',
      ),
    )
  }
  quiet(tx.objectStore('records').clear())
  quiet(tx.objectStore('images').clear())
  await tx.done
}

// ───────────────────────────────── hydration ─────────────────────────────────

/**
 * READ THE STORE BEFORE THE FIRST RENDER (D-2). Never rejects: every failure
 * ends in a working app from the seed, in memory, with the reason logged.
 */
export async function hydrate(): Promise<StoreMode> {
  let state = seedState()
  let next: StoreMode = 'memory'
  try {
    db = await openWithTimeout()
    if (db) {
      const raw = await readRaw(db)
      const found = classify(raw)
      next = 'persist'
      switch (found.kind) {
        case 'empty':
          break
        case 'ok':
          state = fromStored(found.records, raw.images)
          baseRevision = found.meta.revision
          storeHasSnapshot = true
          pendingFull = found.migrated
          break
        case 'newer':
          logPersistence('newer-schema', `stored ${found.meta.schemaVersion} > ${SCHEMA_VERSION}`)
          db.close()
          db = null
          next = 'readonly'
          break
        case 'seed-changed':
          logPersistence('seed-changed', 'stored data discarded for the new seed')
          await clearStore(db, null)
          break
        case 'quarantine':
          logPersistence('quarantined', found.reason)
          await clearStore(db, { reason: found.reason, raw })
          break
      }
    }
  } catch (error) {
    logPersistence('open-failed', describe(error))
    db?.close()
    db = null
    state = seedState()
    next = 'memory'
    baseRevision = 0
    storeHasSnapshot = false
    pendingFull = false
  }

  hydrated = state
  latest = { ...state }
  lastPersisted = { ...state }
  markReferenced(referencedImageUrls(state))
  if (next === 'persist' && typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(CHANNEL_NAME)
    channel.onmessage = (event: MessageEvent) => {
      void enqueue(() => onRemote(event.data))
    }
  }
  setMode(next)
  return next
}

/** The state the providers' initialisers read. Only valid after `hydrate()`. */
export function hydratedState(): AppState {
  if (hydrated === null) throw new Error('hydratedState() called before hydrate() resolved')
  return hydrated
}

export function storeMode(): StoreMode {
  return mode
}

/**
 * Gate 87: hear every mode change (for `useSyncExternalStore` with
 * `storeMode` as the snapshot). Needed because a failed write logs its event
 * BEFORE it switches the mode, so a diagnostics listener reads the old mode.
 */
export function subscribeStoreMode(listener: () => void): () => void {
  modeListeners.add(listener)
  return () => {
    modeListeners.delete(listener)
  }
}

/**
 * Resolves when every write queued SO FAR has finished — for specs, which reach
 * this module by importing it in the page (`ocr.spec.ts`'s precedent), and for
 * the settings-modal gate. Never rejects.
 */
export function whenIdle(): Promise<void> {
  return queue
}

// ───────────────────────────────── writing ───────────────────────────────────

/** Called by `usePersistence` after a commit. Never writes synchronously. */
function reportState(partial: Partial<AppState>): void {
  Object.assign(latest, partial)
  if (!isComplete(latest)) return
  const dirty = RECORD_KEYS.some((key) => latest[key] !== lastPersisted[key])
  if (!dirty && !pendingFull) return
  if (scheduled) return
  scheduled = true
  void enqueue(async () => {
    scheduled = false
    await flush(false)
  })
}

/**
 * Store the latest committed state. ONE transaction; the whole of every changed
 * collection (or of every collection, on the first write and after a reset).
 *
 * `authoritative` (reset only) skips the revision guard: a reset wins.
 */
async function flush(authoritative: boolean): Promise<void> {
  if (!isComplete(latest)) return
  const state: AppState = { ...latest }
  const dirty = RECORD_KEYS.filter((key) => state[key] !== lastPersisted[key])
  if (dirty.length === 0 && !pendingFull) return
  const urls = referencedImageUrls(state)

  if (mode !== 'persist' || db === null) {
    // Nothing to write; still release images no record names any more.
    markPersisted(state)
    markReferenced(urls)
    releaseUnreferenced(urls)
    return
  }

  let stored: StoredRecords
  try {
    stored = toStored(state)
  } catch (error) {
    logPersistence('write-failed', describe(error))
    setMode('memory')
    markPersisted(state)
    return
  }
  const keys = pendingFull || !storeHasSnapshot ? RECORD_KEYS : dirty
  const imageIds = referencedImageIds(stored)

  const tx = db.transaction(['records', 'images'], 'readwrite', { durability: 'strict' })
  quiet(tx.done)
  try {
    const recordStore = tx.objectStore('records')
    const imageStore = tx.objectStore('images')
    const meta = await recordStore.get('meta')
    const storedRevision = isStoredMeta(meta) ? meta.revision : 0

    if (isStoredMeta(meta) && meta.schemaVersion > SCHEMA_VERSION) {
      tx.abort()
      logPersistence('newer-schema', 'found while writing; this tab is now read-only')
      setMode('readonly')
      return
    }
    if (!authoritative && storedRevision !== baseRevision) {
      // D-12: another tab wrote since this one last read. NEVER overwrite —
      // drop this write and show the store's truth.
      tx.abort()
      logPersistence(
        'stale-write-dropped',
        `store at revision ${storedRevision}, this tab at ${baseRevision}`,
      )
      await rehydrate('after a stale write')
      return
    }

    const present = new Set(await imageStore.getAllKeys())
    for (const id of imageIds) {
      if (present.has(id)) continue
      const blob = imageBlob(id)
      if (blob === undefined) throw new Error(`image ${id} has no bytes in this tab`)
      quiet(imageStore.put(blob, id))
    }
    // D-8: bytes no record names are deleted in the SAME transaction.
    for (const id of present) if (!imageIds.has(id)) quiet(imageStore.delete(id))
    for (const key of keys) quiet(recordStore.put(stored[key], key))
    const revision = Math.max(storedRevision, baseRevision) + 1
    const nextMeta: StoredMeta = {
      schemaVersion: SCHEMA_VERSION,
      seedFingerprint: seedFingerprint(),
      revision,
    }
    quiet(recordStore.put(nextMeta, 'meta'))
    await tx.done

    baseRevision = revision
    storeHasSnapshot = true
    pendingFull = false
    markPersisted(state)
    markReferenced(urls)
    releaseUnreferenced(urls)
    // Gate 87: `reset` tells other tabs this write was a reset (only `flush(true)`
    // is one), so they can say so; an ordinary write stays silent there.
    channel?.postMessage({ revision, schemaVersion: SCHEMA_VERSION, reset: authoritative })
  } catch (error) {
    try {
      tx.abort()
    } catch {
      // already finished or aborted
    }
    logPersistence('write-failed', describe(error))
    setMode('memory')
    markPersisted(state)
    markReferenced(urls)
    releaseUnreferenced(urls)
  }
}

// ───────────────────────────── other tabs, rehydration ───────────────────────

function apply(state: AppState): void {
  // Set the bookkeeping FIRST, so the providers' reports of these very values
  // are recognised as already stored and nothing is written back.
  latest = { ...state }
  lastPersisted = { ...state }
  for (const applyToProvider of appliers) applyToProvider(state)
}

async function rehydrate(reason: string): Promise<void> {
  if (db === null) return
  const raw = await readRaw(db)
  const found = classify(raw)
  if (found.kind === 'newer') {
    logPersistence('newer-schema', `found on rehydrate (${reason}); this tab is now read-only`)
    setMode('readonly')
    return
  }
  if (found.kind === 'ok') {
    const state = fromStored(found.records, raw.images)
    baseRevision = found.meta.revision
    storeHasSnapshot = true
    apply(state)
    markReferenced(referencedImageUrls(state))
    releaseUnreferenced(referencedImageUrls(state))
  } else if (found.kind === 'empty') {
    baseRevision = 0
    storeHasSnapshot = false
    clearCaptureFacts()
    apply(seedState())
  } else {
    // Unreadable now although this tab read it before: stop writing.
    logPersistence('write-failed', `rehydrate found ${found.kind} (${reason})`)
    setMode('memory')
    return
  }
  logPersistence('rehydrated', reason)
}

async function onRemote(message: unknown): Promise<void> {
  if (typeof message !== 'object' || message === null) return
  const { revision, schemaVersion, reset } = message as {
    revision?: unknown
    schemaVersion?: unknown
    reset?: unknown
  }
  if (typeof schemaVersion === 'number' && schemaVersion > SCHEMA_VERSION) {
    logPersistence('newer-schema', 'announced by another tab; this tab is now read-only')
    setMode('readonly')
    return
  }
  if (mode !== 'persist') return
  if (revision !== baseRevision) {
    await rehydrate('another tab wrote')
    if (reset === true && mode === 'persist') logPersistence('remote-reset')
  }
}

// ───────────────────────────────── reset ─────────────────────────────────────

/**
 * RETURN EVERY PERSISTED ATOM TO THE SEED — programmatic only (D-13); the
 * settings-modal gate calls it. One batched update of every atom, then the
 * ordinary save path: the seed is written whole, every stored image byte is
 * deleted in that transaction (the seed references none), and every object
 * URL a record held is revoked. Other tabs follow through the broadcast.
 *
 * LEFT ALONE: tesseract.js's `keyval-store` database, the theme, UI state and
 * the route. A screen showing an id the seed lacks takes its existing
 * unknown-id redirect.
 */
export function resetToSeed(): Promise<void> {
  return enqueue(async () => {
    const seed = seedState()
    clearCaptureFacts()
    pendingFull = true
    // `latest` is the seed; `lastPersisted` is not, so the flush writes it.
    latest = { ...seed }
    for (const applyToProvider of appliers) applyToProvider(seed)
    logPersistence('reset')
    await flush(true)
  })
}

// ───────────────────────────────── the provider hook ─────────────────────────

/**
 * Wire a provider's atoms to the store. `atoms` are reported after every commit
 * that changes one; `applyState` sets the provider's atoms when the store
 * replaces them (another tab wrote, a stale write was dropped, or a reset). It
 * must be stable (`useCallback`) and call only setters.
 */
export function usePersistence(
  atoms: Partial<AppState>,
  applyState: (state: AppState) => void,
): void {
  useEffect(() => {
    appliers.add(applyState)
    return () => {
      appliers.delete(applyState)
    }
  }, [applyState])

  // Keyed on each atom's identity: an immutable update is a new array.
  const deps = RECORD_KEYS.map((key) => atoms[key])
  useEffect(() => {
    reportState(atoms)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

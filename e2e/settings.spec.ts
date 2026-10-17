import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { activateTab, gotoRoute, watchForProblems } from './harness'
import { FIXTURE } from './capture'
import { FIAT_ACCOUNTS } from '../src/data/accounts'
import { formatMyr } from '../src/data/format'
import { GOALS } from '../src/data/goals'
import { SCHEMA_VERSION } from '../src/persistence/schema'
import {
  THEME_PREFERENCES,
  THEME_STORAGE_KEY,
  readThemePreference,
  resolveTheme,
  themeAttribute,
} from '../src/theme/themePreference'

/**
 * ─────────────────────────── SETTINGS — Gate 87 ───────────────────────────
 *
 * The settings screen, the stored theme preference, Reset data, and the
 * app-level notices. No baseline: the three walk states (`/settings`,
 * `[overlay:reset]`, `[overlay:reset-done]`) photograph the screen; these
 * tests assert what a picture cannot — where Back lands, what is stored, what
 * another tab hears, what is announced, and what is disabled and why.
 *
 * THE STORE IS READ STRAIGHT FROM IndexedDB, never through the app's own store
 * module (Gate 85's rule). The app's modules are imported in the page only to
 * WAIT (`whenIdle`) or to read the diagnostics log — dev server only, the
 * `ocr.spec.ts` precedent.
 *
 * Helpers below are copied from `persistence.spec.ts` (Gate 85-B ruling R1:
 * duplicated store helpers are accepted until the hygiene round consolidates
 * them into `harness.ts`).
 */

const DB = 'monarch-mvp'
const BALI = GOALS.find((g) => g.id === 'goal-bali-trip')!
const BALI_ROUTE = `/finance/plans/goals/${BALI.id}`
const STORE_MODULE = '/src/persistence/store.ts'
const DIAGNOSTICS_MODULE = '/src/persistence/diagnostics.ts'

/** The seed's balances, as the confirmation names them — derived, never typed. */
const SEED_BALANCES = FIAT_ACCOUNTS.map((a) => `${a.name} ${formatMyr(a.balance)}`).join(' and ')

interface StoreDump {
  records: Record<string, unknown>
  imageIds: string[]
}

async function readStore(page: Page): Promise<StoreDump | null> {
  return page.evaluate(async (name) => {
    const databases = await indexedDB.databases()
    if (!databases.some((d) => d.name === name)) return null
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const all = (store: string) =>
      new Promise<Record<string, unknown>>((resolve, reject) => {
        const tx = db.transaction(store)
        const keys = tx.objectStore(store).getAllKeys()
        const values = tx.objectStore(store).getAll()
        tx.oncomplete = () =>
          resolve(Object.fromEntries(keys.result.map((k, i) => [String(k), values.result[i]])))
        tx.onerror = () => reject(tx.error)
      })
    const records = await all('records')
    const images = await all('images')
    db.close()
    return { records, imageIds: Object.keys(images) }
  }, DB)
}

async function writeRecords(page: Page, entries: Record<string, unknown>): Promise<void> {
  await page.evaluate(
    async ({ name, entries }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(name)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('records', 'readwrite')
        for (const [key, value] of Object.entries(entries)) tx.objectStore('records').put(value, key)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      db.close()
    },
    { name: DB, entries },
  )
}

async function storeIdle(page: Page): Promise<void> {
  await page.evaluate(async (path) => {
    const store: { whenIdle: () => Promise<void> } = await import(path)
    await store.whenIdle()
  }, STORE_MODULE)
}

async function persistenceKinds(page: Page): Promise<string[]> {
  return page.evaluate(async (path) => {
    const diagnostics: { persistenceLog: () => { kind: string }[] } = await import(path)
    return diagnostics.persistenceLog().map((e) => e.kind)
  }, DIAGNOSTICS_MODULE)
}

const storedGoal = (dump: StoreDump | null, id: string) =>
  (dump?.records.goals as { id: string; savedAmount: number }[] | undefined)?.find((g) => g.id === id)

const baliSaved = (page: Page) => page.locator('.mn-progress-bar__current')

async function topUp(page: Page, amount: string): Promise<void> {
  await page.locator('.mvp-finance-detail__actions .mn-btn--primary').click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('input[name="amount"]').fill(amount)
  await dialog.getByRole('button', { name: 'Confirm Top-Up' }).click()
  await expect(dialog).toHaveCount(0)
}

// ── the settings screen's own controls ─────────────────────────────────────

const avatar = (page: Page) => page.getByRole('button', { name: 'Settings' })
const backControl = (page: Page) => page.getByRole('button', { name: 'Back' })
const darkSwitch = (page: Page) => page.getByRole('switch', { name: 'Dark mode' })
/** DS `Toggle` paints its track over the input; the <label> is what a user presses. */
const darkToggle = (page: Page) => page.locator('.mvp-settings .mn-toggle')
const resetButton = (page: Page) => page.locator('.mvp-settings__action .mn-btn')
const resetReason = (page: Page) => page.locator('.mvp-settings__reason')
const notice = (page: Page) => page.locator('.mvp-notice .mn-toast-mobile')
const screenToast = (page: Page) => page.locator('.mvp-finance-detail__toast .mn-toast-mobile')

async function resetThroughTheUi(page: Page): Promise<void> {
  await resetButton(page).click()
  const dialog = page.getByRole('dialog', { name: 'Reset demo data?' })
  await expect(dialog).toHaveCount(1)
  await dialog.locator('.mn-modal__footer .mn-btn--error').click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(notice(page)).toHaveText('Demo data restored.')
}

/** Back from a goal drill-down to `/finance` (the Plans tab), then the avatar. */
async function settingsFromBali(page: Page): Promise<void> {
  await backControl(page).click()
  await expect(page).toHaveURL(/\/finance$/)
  await avatar(page).click()
  await expect(page).toHaveURL(/\/settings$/)
}

// ═══════════════════════════ entry and Back ═══════════════════════════════

test('the avatar on Home opens Settings, and Back returns to the Home tab you came from', async ({ page }) => {
  await gotoRoute(page, '/', 'light')
  await activateTab(page, { id: 'crypto', label: 'Crypto' })
  await avatar(page).click()
  await expect(page).toHaveURL(/\/settings$/)
  await expect(page.locator('.mn-header-default__title')).toHaveText('Settings')

  await backControl(page).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('tab', { name: 'Crypto' })).toHaveAttribute('aria-selected', 'true')
})

test('the avatar on Finance opens Settings, and Back returns to the Finance tab you came from', async ({
  page,
}) => {
  await gotoRoute(page, '/finance', 'light')
  await activateTab(page, { id: 'plans', label: 'Plans' })
  await avatar(page).click()
  await expect(page).toHaveURL(/\/settings$/)

  await backControl(page).click()
  await expect(page).toHaveURL(/\/finance$/)
  await expect(page.getByRole('tab', { name: 'Plans' })).toHaveAttribute('aria-selected', 'true')
})

test('Settings opened directly goes Back to Home', async ({ page }) => {
  await gotoRoute(page, '/settings', 'light')
  const before = await page.evaluate(() => history.length)
  await backControl(page).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('tab', { name: 'Accounts' })).toHaveAttribute('aria-selected', 'true')
  // A REPLACE, not a push: Back from Home cannot land on Settings again.
  expect(await page.evaluate(() => history.length)).toBe(before)
})

// ═══════════════════════════ the theme preference ═════════════════════════

test('the Dark mode switch applies dark, announces it, and stores the preference', async ({ page }) => {
  await gotoRoute(page, '/settings', 'light')
  await expect(darkSwitch(page)).toHaveAttribute('aria-checked', 'false')

  await darkToggle(page).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(darkSwitch(page)).toHaveAttribute('aria-checked', 'true')
  expect(await page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY)).toBe('dark')

  await darkToggle(page).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', '')
  await expect(darkSwitch(page)).toHaveAttribute('aria-checked', 'false')
  expect(await page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY)).toBe('light')
})

test('a stored dark preference survives a reload with no light frame', async ({ page }) => {
  await gotoRoute(page, '/settings', 'light')
  await darkToggle(page).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  // Record, from the moment the document exists, every value `data-theme` is
  // given, and its value at the moment <body> first appears — before the body
  // can paint, and long before React renders (it waits on hydrate()).
  await page.addInitScript(() => {
    const seen = { values: [] as (string | null)[], atBody: 'unset' as string | null }
    ;(window as unknown as { __theme: typeof seen }).__theme = seen
    new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'attributes' && r.attributeName === 'data-theme') {
          seen.values.push(document.documentElement.getAttribute('data-theme'))
        }
        if (r.type === 'childList' && seen.atBody === 'unset' && document.body) {
          seen.atBody = document.documentElement.getAttribute('data-theme')
        }
      }
    }).observe(document, { subtree: true, childList: true, attributes: true })
  })
  await page.reload()
  await expect(page.locator('#root')).toHaveAttribute('data-store', 'persist')
  await expect(darkSwitch(page)).toHaveAttribute('aria-checked', 'true')

  const seen = await page.evaluate(
    () => (window as unknown as { __theme: { values: (string | null)[]; atBody: string | null } }).__theme,
  )
  expect(seen.atBody, 'the theme was already dark when <body> appeared').toBe('dark')
  expect(seen.values.length).toBeGreaterThan(0)
  expect(seen.values.every((v) => v === 'dark'), `data-theme values seen: ${seen.values.join(', ')}`).toBe(true)
})

test('an invalid or unreadable stored preference resolves to light, with no console error', async ({
  page,
  context,
}) => {
  const problems = watchForProblems(page)
  await page.addInitScript((key) => localStorage.setItem(key, 'purple'), THEME_STORAGE_KEY)
  await gotoRoute(page, '/settings', 'light')
  await expect(darkSwitch(page)).toHaveAttribute('aria-checked', 'false')
  expect(problems.console).toEqual([])

  // A storage that THROWS on read — blocked site data, some private modes.
  // Same context, its own page: the override below is this page's alone.
  const blocked = await context.newPage()
  const blockedProblems = watchForProblems(blocked)
  await blocked.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException('storage is blocked', 'SecurityError')
    }
  })
  await gotoRoute(blocked, '/settings', 'light')
  await expect(darkSwitch(blocked)).toHaveAttribute('aria-checked', 'false')
  expect(blockedProblems.console).toEqual([])
})

test('a theme change in one tab reaches another', async ({ page, context }) => {
  await gotoRoute(page, '/settings', 'light')
  const other = await context.newPage()
  await gotoRoute(other, BALI_ROUTE, 'light')

  await darkToggle(page).click()
  await expect(other.locator('html')).toHaveAttribute('data-theme', 'dark')

  await darkToggle(page).click()
  await expect(other.locator('html')).toHaveAttribute('data-theme', '')
})

test('the theme survives Reset data', async ({ page }) => {
  await gotoRoute(page, '/settings', 'light')
  await darkToggle(page).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await resetThroughTheUi(page)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect(await page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY)).toBe('dark')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

// ═══════════════════════════ Reset data ═══════════════════════════════════

test('Reset data restores the seed, and the restored state is KEPT after a reload', async ({ page }) => {
  await gotoRoute(page, BALI_ROUTE, 'light')
  await topUp(page, '125.50')
  await storeIdle(page)
  expect(storedGoal(await readStore(page), BALI.id)?.savedAmount).toBe(5165.5)

  await settingsFromBali(page)
  await resetThroughTheUi(page)
  await storeIdle(page)
  expect(storedGoal(await readStore(page), BALI.id)?.savedAmount).toBe(BALI.savedAmount)
  expect(await persistenceKinds(page)).toContain('reset')

  await page.goto(BALI_ROUTE)
  await expect(page.locator('#root')).toHaveAttribute('data-store', 'persist')
  await expect(baliSaved(page)).toContainText(formatMyr(BALI.savedAmount))
})

test('Reset data in one tab updates another tab without a reload', async ({ page, context }) => {
  await gotoRoute(page, BALI_ROUTE, 'light')
  await topUp(page, '125.50')
  await storeIdle(page)
  await expect(baliSaved(page)).toContainText('RM 5,165.50')

  const settings = await context.newPage()
  await gotoRoute(settings, '/settings', 'light')
  await resetThroughTheUi(settings)

  await expect(baliSaved(page)).toContainText(formatMyr(BALI.savedAmount))
})

test('another tab is told the demo data was reset, and an ordinary write from another tab raises nothing', async ({
  page,
  context,
}) => {
  await gotoRoute(page, '/settings', 'light')
  const other = await context.newPage()
  await gotoRoute(other, BALI_ROUTE, 'light')

  // AN ORDINARY WRITE in the other tab: this tab re-hydrates, silently.
  await topUp(other, '125.50')
  await storeIdle(other)
  await expect.poll(() => persistenceKinds(page)).toContain('rehydrated')
  await expect(page.locator('.mvp-notice')).toHaveCount(0)

  // A RESET in this tab: the other tab is told, politely.
  await resetThroughTheUi(page)
  await expect(notice(other)).toHaveText('The demo data was reset in another tab.')
  await expect(notice(other)).toHaveAttribute('role', 'status')
  await expect(baliSaved(other)).toContainText(formatMyr(BALI.savedAmount))
})

test("Reset data releases an uploaded image's object URL, with no reload", async ({ page }) => {
  await gotoRoute(page, BALI_ROUTE, 'light')
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Edit image' }).click(),
  ])
  await chooser.setFiles(FIXTURE)
  await storeIdle(page)
  const uploaded = await page.locator('.mvp-goal-detail__image img').getAttribute('src')
  expect(uploaded).toMatch(/^blob:/)

  // A fresh <img> on the URL, as nothing on screen has decoded it yet.
  const decodes = (url: string) =>
    page.evaluate(
      (src) =>
        new Promise<number>((resolve) => {
          const img = new Image()
          img.onload = () => resolve(img.naturalWidth)
          img.onerror = () => resolve(0)
          img.src = src
        }),
      url,
    )
  expect(await decodes(uploaded!), 'the control: before the reset the URL decodes').toBeGreaterThan(0)

  await settingsFromBali(page)
  await resetThroughTheUi(page)
  await storeIdle(page)
  expect((await readStore(page))!.imageIds).toEqual([])
  expect(await decodes(uploaded!), 'after the reset the URL is revoked').toBe(0)
})

test("Reset data leaves tesseract's keyval-store alone", async ({ page }) => {
  await gotoRoute(page, '/settings', 'light')
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('keyval-store', 1)
        request.onupgradeneeded = () => request.result.createObjectStore('keyval')
        request.onsuccess = () => {
          const tx = request.result.transaction('keyval', 'readwrite')
          tx.objectStore('keyval').put('model bytes', './eng.traineddata')
          tx.oncomplete = () => {
            request.result.close()
            resolve()
          }
          tx.onerror = () => reject(tx.error)
        }
      }),
  )

  await resetThroughTheUi(page)
  await storeIdle(page)

  const tesseract = await page.evaluate(
    () =>
      new Promise<string | null>((resolve) => {
        const request = indexedDB.open('keyval-store')
        request.onsuccess = () => {
          const db = request.result
          if (!db.objectStoreNames.contains('keyval')) {
            db.close()
            resolve(null)
            return
          }
          const get = db.transaction('keyval').objectStore('keyval').get('./eng.traineddata')
          get.onsuccess = () => {
            db.close()
            resolve((get.result as string | undefined) ?? null)
          }
          get.onerror = () => resolve(null)
        }
        request.onerror = () => resolve(null)
      }),
  )
  expect(tesseract).toBe('model bytes')
})

test('the confirmation names the money and the data, and Cancel changes nothing', async ({ page }) => {
  await gotoRoute(page, BALI_ROUTE, 'light')
  await topUp(page, '125.50')
  await storeIdle(page)
  await settingsFromBali(page)

  await resetButton(page).click()
  const dialog = page.getByRole('dialog', { name: 'Reset demo data?' })
  await expect(dialog.locator('.mvp-settings__confirm-body')).toHaveText(
    "This puts back the original demo data. Everything you've added or changed is removed: " +
      'transactions, receipts and their photos, budgets, and goals and their photos. ' +
      `Account balances go back to ${SEED_BALANCES}. ` +
      "Your appearance setting stays as it is. This can't be undone.",
  )

  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await storeIdle(page)
  expect(storedGoal(await readStore(page), BALI.id)?.savedAmount).toBe(5165.5)
  expect(await persistenceKinds(page)).not.toContain('reset')
  await expect(page.locator('.mvp-notice')).toHaveCount(0)
})

// ═══════════════════════════ notices ══════════════════════════════════════

test('a failed save raises the not-being-saved notice as an alert', async ({ page }) => {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
      if (this.name === 'records') throw new DOMException('injected', 'QuotaExceededError')
      return put.call(this, value, key)
    }
  })
  await gotoRoute(page, BALI_ROUTE, 'light')
  await expect(page.locator('.mvp-notice')).toHaveCount(0)

  await topUp(page, '125.50')
  await storeIdle(page)
  await expect(page.locator('#root')).toHaveAttribute('data-store', 'memory')
  await expect(notice(page)).toHaveAttribute('role', 'alert')
  await expect(notice(page).locator('.mn-toast-mobile__title')).toHaveText("Changes aren't being saved")
  await expect(notice(page).locator('.mn-toast-mobile__desc')).toHaveText(
    "This device can't save right now. What you change will be lost when you close the app.",
  )
})

test('a changed demo seed at boot raises a notice', async ({ page }) => {
  await gotoRoute(page, BALI_ROUTE, 'light')
  await topUp(page, '125.50')
  await storeIdle(page)
  const meta = (await readStore(page))!.records.meta as Record<string, unknown>
  await writeRecords(page, { meta: { ...meta, seedFingerprint: '00000000000000' } })

  await page.reload()
  await expect(baliSaved(page)).toContainText(formatMyr(BALI.savedAmount))
  await expect(notice(page)).toHaveAttribute('role', 'status')
  await expect(notice(page).locator('.mn-toast-mobile__title')).toHaveText('The demo data was updated')
})

test('Reset is disabled, with its reason, in a read-only tab', async ({ page }) => {
  await gotoRoute(page, '/settings', 'light')
  await expect(resetButton(page)).toBeEnabled()
  await expect(resetReason(page)).toHaveCount(0)

  const newer = { schemaVersion: SCHEMA_VERSION + 1, seedFingerprint: 'from-the-future', revision: 9 }
  await writeRecords(page, { meta: newer })
  await page.reload()
  await expect(page.locator('#root')).toHaveAttribute('data-store', 'readonly')
  await expect(resetButton(page)).toBeDisabled()
  await expect(resetReason(page)).toHaveText(
    "This tab is out of date, so it can't reset. Reopen the app to reset.",
  )
})

test('Reset is disabled, with its reason, when nothing can be saved', async ({ page }) => {
  await page.addInitScript(() => {
    indexedDB.open = () => {
      throw new DOMException('storage is blocked', 'SecurityError')
    }
  })
  await gotoRoute(page, '/settings', 'light')
  await expect(page.locator('#root')).toHaveAttribute('data-store', 'memory')
  await expect(resetButton(page)).toBeDisabled()
  await expect(resetReason(page)).toHaveText("This device isn't saving changes, so there's nothing to reset.")
})

test('a screen toast and a storage notice never overlap', async ({ page }) => {
  // The ruling's own scenario: Delete goal, whose write fails.
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
      if (this.name === 'records') throw new DOMException('injected', 'QuotaExceededError')
      return put.call(this, value, key)
    }
  })
  await gotoRoute(page, BALI_ROUTE, 'light')
  await page.locator('.mvp-finance-detail__actions .mn-btn--secondary').click()
  await page.locator('.mn-modal__footer .mn-btn--error').click()
  await page.locator('.mn-modal__footer .mn-btn--error:has(span:text-is("Delete"))').click()

  await expect(page).toHaveURL(/\/finance$/)
  await expect(screenToast(page)).toHaveText('Goal deleted.')
  await expect(notice(page)).toHaveAttribute('role', 'alert')

  // Poll the geometry: the host measures the toast after it mounts.
  const rects = () =>
    page.evaluate(() => {
      const box = (sel: string) => {
        const el = document.querySelector(sel)
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }
      }
      return {
        toast: box('.mvp-finance-detail__toast .mn-toast-mobile'),
        notice: box('.mvp-notice .mn-toast-mobile'),
        nav: box('.mvp-shell__nav'),
        innerHeight: window.innerHeight,
      }
    })
  await expect
    .poll(async () => {
      const r = await rects()
      if (!r.toast || !r.notice) return 'missing'
      const apart =
        r.notice.bottom <= r.toast.top ||
        r.toast.bottom <= r.notice.top ||
        r.notice.right <= r.toast.left ||
        r.toast.right <= r.notice.left
      return apart ? 'apart' : `overlap ${JSON.stringify(r)}`
    })
    .toBe('apart')

  const r = await rects()
  for (const [name, box] of [
    ['toast', r.toast!],
    ['notice', r.notice!],
  ] as const) {
    expect(box.top, `${name} top inside the viewport`).toBeGreaterThanOrEqual(0)
    expect(box.bottom, `${name} bottom inside the viewport`).toBeLessThanOrEqual(r.innerHeight)
    expect(box.bottom, `${name} above the nav band`).toBeLessThanOrEqual(r.nav!.top)
  }
})

// ═══════════════════════════ the pre-paint script ═════════════════════════

test('the pre-paint script and ThemeProvider agree on every stored value', () => {
  // The inline script, exactly as `index.html` ships it.
  const html = readFileSync('index.html', 'utf8')
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])
  const prePaint = scripts.filter((s) => s.includes('localStorage'))
  expect(prePaint, 'exactly one inline script reads localStorage').toHaveLength(1)
  const run = new Function('window', 'document', prePaint[0])

  const THROWS = Symbol('throws')
  const candidates: (string | null | typeof THROWS)[] = [
    ...THEME_PREFERENCES,
    'purple',
    'DARK',
    '',
    null,
    THROWS,
  ]

  const realStorage = (globalThis as { localStorage?: unknown }).localStorage
  try {
    for (const value of candidates) {
      const keysRead: string[] = []
      const storage = {
        getItem(key: string) {
          keysRead.push(key)
          if (value === THROWS) throw new Error('storage is blocked')
          return value
        },
      }
      // The script's path.
      let attribute: string | null = null
      const document = {
        documentElement: {
          setAttribute(name: string, v: string) {
            if (name === 'data-theme') attribute = v
          },
        },
      }
      run({ localStorage: storage }, document)

      // ThemeProvider's path: the same stored value through `readThemePreference`.
      ;(globalThis as { localStorage?: unknown }).localStorage = storage
      const expected = themeAttribute(resolveTheme(readThemePreference()))

      const label = value === THROWS ? '(getItem throws)' : JSON.stringify(value)
      expect(attribute ?? '', `stored ${label}`).toBe(expected)
      expect(keysRead, `stored ${label}: both read THEME_STORAGE_KEY`).toEqual([
        THEME_STORAGE_KEY,
        THEME_STORAGE_KEY,
      ])
    }
  } finally {
    if (realStorage === undefined) delete (globalThis as { localStorage?: unknown }).localStorage
    else (globalThis as { localStorage?: unknown }).localStorage = realStorage
  }
})

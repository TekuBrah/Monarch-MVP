/**
 * Media slots — the single source of truth for user-supplied imagery.
 *
 * Plain data plus pure resolvers. No React, no imports, no work at module load.
 *
 * WHY `public/` AND NOT `src/assets/`. Decided, not up for re-litigation. Vite
 * copies `public/` verbatim, so dropping a file into `public/media/<slot>/`
 * makes it live on the next refresh with **no import statement to edit**.
 * `src/assets/` would need a bundler import per file, which defeats the point.
 * The trade is real and accepted: `public/` URLs are not fingerprinted and not
 * verified at build time, so a typo in a path here fails at runtime (broken
 * image) rather than at compile time.
 *
 * THE RULE FOR COMPONENTS: read a URL from `mediaUrl(slot)`. Never write a
 * literal `/media/...` path in a component. That one rule is what lets the
 * future customisation flow land without touching a single consumer — it swaps
 * what `setMediaSource()` holds, and every call site follows.
 *
 * KNOWN LIMIT OF THE SEAM, stated rather than discovered later: `currentSource`
 * is a module-level binding, so changing it does **not** trigger a React
 * re-render. That is fine today because nothing changes it after load. When the
 * real customisation flow arrives it will want the source in React state and
 * should pass it explicitly — every resolver here takes `source` as an optional
 * second argument for exactly that reason, so the pure path already exists and
 * the mutable default can simply stop being used.
 */

/** Logical slot names. The map below is exhaustive over this union by type. */
export type MediaSlot = 'profile' | 'banner' | 'academy'

/**
 * ⇩ THE LINES YOU EDIT. This is the whole workflow: drop a file into
 * `public/media/<slot>/`, point that slot's line here at `/media/<slot>/<file>`,
 * refresh. Nothing else in the app changes.
 *
 * Paths are PUBLIC URLs, not filesystem paths — `/media/banner/x.svg`, never
 * `public/media/banner/x.svg`. Vite serves `public/` from the site root, so the
 * `public/` prefix is not part of the URL and including it 404s.
 *
 * Set a slot to `null`, `''`, or delete the line, and that slot falls back to
 * its placeholder. Nothing here is verified at build time — a typo fails
 * silently at runtime to the gradient fallback, with a green build.
 *
 * `academy` is deliberately set but NOT rendered anywhere — see the note on
 * `consumable` below.
 *
 * (`MediaSource` is declared further down; TypeScript hoists type aliases, and
 * this constant is up here because it is the one thing anyone comes to edit.)
 */
export const ACTIVE_MEDIA: MediaSource = {
  profile: '/media/profile/user_margaret.webp',
  banner: '/media/banner/imgbg01.webp',
  academy: '/media/academy/monarchacademy_img.png',
}

export interface MediaSlotSpec {
  readonly slot: MediaSlot
  /** Human label, for a future picker UI. */
  readonly label: string
  /** Where a real file gets dropped. Each directory carries its own README
   *  stating measured dimensions, aspect ratio and format for that slot. */
  readonly publicDir: string
  /** The explicit fallback, used whenever the slot is unset. Never empty —
   *  every slot resolves to something renderable at all times. */
  readonly placeholder: string
  /**
   * Whether any component can actually render this slot today.
   *
   * All three slots are now `true`. `academy` flipped in Gate 3b, and the reason
   * is worth keeping straight, because the DS gap it used to name still exists:
   *
   * THE DS GAP IS REAL BUT WAS NEVER WHAT BLOCKED THIS SLOT. `CardFeaturesAndEducation`
   * still has no media slot — prop surface `variant` / `icon` / `title` /
   * `onClick` / `className`, source renders exactly two children (an icon span
   * and a title span), no media region. Pushing an `<img>` through `icon` would
   * be forcing media through an icon slot (CLAUDE.md rule 3), and it is still
   * not done. `CardGoals.image` remains the in-DS precedent if that card ever
   * needs one.
   *
   * What changed is the TARGET, not the DS. Figma puts the Academy illustration
   * in the `❖ System message` band — `.mvp-home__promo`, which is MVP-owned
   * composition — and NOT in the three `card/features and education` tiles. So
   * this slot never needed a DS change; it needed the right host. Gate 2 read
   * that structure out of Figma (`1266:14402`): illustration 94.08 x 65 at x=0,
   * text column 224.92 wide at x=102.08, inside a 327-wide content frame.
   */
  readonly consumable: boolean
}

export const MEDIA_SLOTS: Readonly<Record<MediaSlot, MediaSlotSpec>> = {
  profile: {
    slot: 'profile',
    label: 'Profile picture',
    publicDir: 'public/media/profile',
    placeholder: '/media/profile/placeholder.svg',
    consumable: true,
  },
  banner: {
    slot: 'banner',
    label: 'Top banner',
    publicDir: 'public/media/banner',
    placeholder: '/media/banner/placeholder.svg',
    consumable: true,
  },
  academy: {
    slot: 'academy',
    label: 'Monarch Academy card',
    publicDir: 'public/media/academy',
    placeholder: '/media/academy/placeholder.svg',
    consumable: true,
  },
}

/** Iteration order for a future picker UI. */
export const MEDIA_SLOT_IDS: readonly MediaSlot[] = ['profile', 'banner', 'academy']

/**
 * What a customisation flow supplies: slot -> chosen URL.
 *
 * A slot may be absent, `null` or `''` — all three mean "unset, use the
 * placeholder". Accepting all three is deliberate: a form field that has been
 * cleared yields `''`, and a cleared database column yields `null`.
 */
export type MediaSource = Partial<Record<MediaSlot, string | null>>

/**
 * The active source, seeded from `ACTIVE_MEDIA`.
 *
 * This seed is what makes the drop-in workflow actually work: before Gate 1b it
 * started as `{}`, so every slot resolved to its placeholder and dropping a real
 * file into `public/media/<slot>/` changed nothing on screen.
 */
let currentSource: MediaSource = ACTIVE_MEDIA

/**
 * Install the active source. The one function a customisation flow calls.
 *
 * `null`/`undefined` restores `ACTIVE_MEDIA` — "no override, use the configured
 * defaults" — rather than clearing to placeholders. To force a placeholder,
 * unset that individual slot (`null`, `''`, or omit it); per-slot fallback is
 * unchanged.
 */
export function setMediaSource(next: MediaSource | null | undefined): void {
  currentSource = next ?? ACTIVE_MEDIA
}

export function getMediaSource(): Readonly<MediaSource> {
  return currentSource
}

export function mediaSpec(slot: MediaSlot): MediaSlotSpec {
  return MEDIA_SLOTS[slot]
}

/**
 * Resolve a slot to a URL. Always returns a renderable string — the slot's
 * placeholder when unset.
 *
 * Pass `source` to keep the call pure (what React state should do later);
 * omit it to read the module default, which is seeded from `ACTIVE_MEDIA` —
 * that is what the app does today. The signature is unchanged from Gate 1, so
 * the future customisation flow is unaffected.
 */
export function mediaUrl(slot: MediaSlot, source: MediaSource = currentSource): string {
  const chosen = source[slot]
  return typeof chosen === 'string' && chosen.length > 0 ? chosen : MEDIA_SLOTS[slot].placeholder
}

/**
 * True when the slot is still showing its placeholder. A customisation UI keys
 * its empty state off this rather than comparing URLs itself.
 */
export function isMediaPlaceholder(
  slot: MediaSlot,
  source: MediaSource = currentSource,
): boolean {
  return mediaUrl(slot, source) === MEDIA_SLOTS[slot].placeholder
}

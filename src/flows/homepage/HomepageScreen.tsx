import { useState } from 'react'
import { HeaderBg, Tabs } from '@monarch/design-system'
import type { TabItem } from '@monarch/design-system'
import { ComingSoon } from '../../components/ComingSoon'
import { mediaUrl } from '../../config/media'
import { HomepageCrypto } from './HomepageCrypto'
import { HomepageFiat } from './HomepageFiat'
import './homepage.css'

/**
 * Flow 1 — the Homepage.
 *
 * ONE ROUTE, FOUR TAB STATES. Flow 1 §3 settled this: "Semantically these are
 * not sequential steps. They are two selected-states of one screen; the
 * transition between them is the `Tabs` component, i.e. in-screen state, not a
 * route change. Two screens, one destination." So the selected tab is
 * `useState` here and never appears in the URL.
 *
 * Header and Tabs live at this level rather than in each panel, which is what
 * makes two Figma defects unrepresentable in code:
 *  - SYS-10, header height varying 44/48/68 (and 64/112 for `Header`): one
 *    component, one size, rendered once.
 *  - SYS-11 / A3, `Tabs` at 343 on Fiat and 306 on Crypto: one instance,
 *    fill-container, so there is nothing to disagree.
 *
 * A1 — RESOLVED: Cards and Stocks have no content by decision, and show the
 * "coming soon" state rather than a missing screen.
 */

const TABS: TabItem[] = [
  { id: 'accounts', label: 'Accounts' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'cards', label: 'Cards' },
  { id: 'stocks', label: 'Stocks' },
]

export function HomepageScreen() {
  const [selected, setSelected] = useState<string>('accounts')

  return (
    <div className="mvp-home">
      {/*
        `HeaderBg` renders the status bar, avatar, greeting and notification
        bell itself. Its `background` is a deliberate slot — Figma fills it with
        a photograph (`img/bg01`).

        Both image slots now resolve through `src/config/media.ts`, never a
        literal path, so a real photo is dropped into `public/media/<slot>/` and
        picked up on refresh with no code change here (Gate 1).

        The gradient class stays ON the `<img>` rather than being deleted: it is
        the element's own `background-image`, so it shows through only if the
        file is missing or fails to decode. Dead CSS became a real fallback —
        which matters precisely because `public/` paths are not build-verified.

        No sizing CSS is needed. DS `HeaderBg.css` already covers the slot:
        `.mn-header-bg__background > *` sets width/height 100% + `object-fit:
        cover`, and the container is `aria-hidden`, so `alt=""` is belt and
        braces rather than the thing doing the work.
      */}
      <HeaderBg
        variant="noSearchBar"
        background={
          <img className="mvp-home__header-bg" src={mediaUrl('banner')} alt="" />
        }
        greeting="Hi, Margaret 👋"
        avatarName="Margaret"
        avatarSrc={mediaUrl('profile')}
        statusBarTime="9:41"
        hasNotification
      />

      <div className="mvp-home__tabs">
        <Tabs
          tabs={TABS}
          selectedId={selected}
          onChange={setSelected}
          ariaLabel="Account type"
        />
      </div>

      {selected === 'accounts' && <HomepageFiat />}
      {selected === 'crypto' && <HomepageCrypto />}
      {selected === 'cards' && (
        <ComingSoon
          title="Cards"
          description="Your physical and virtual cards will live here."
          icon="icon_bank"
        />
      )}
      {selected === 'stocks' && (
        <ComingSoon
          title="Stocks"
          description="Buy, sell and track your holdings from one place."
          icon="icon_stocks"
        />
      )}
    </div>
  )
}

import { useState } from 'react'
import { HeaderBg, Tabs } from '@monarch/design-system'
import type { TabItem } from '@monarch/design-system'
import { ComingSoon } from '../../components/ComingSoon'
import { mediaUrl } from '../../config/media'
import { FinanceOverview } from './FinanceOverview'
import { TransactionsLedger } from './TransactionsLedger'
import './finance.css'

/**
 * Flow 7 — `Finance_Overview01`.
 *
 * ONE ROUTE, FIVE TAB STATES, the same shape Flow 1 established: the tabs are
 * selected-states of one screen, not five destinations, so the selection is
 * `useState` here and never reaches the URL. Only the drill-downs are routes,
 * because those genuinely are separate screens with their own chrome.
 *
 * FIVE TABS — this is what DS v1.2.0 was cut for. Two things were checked
 * before building it and both mattered:
 *
 *  - `TabsProps.tabs` has never carried a count constraint and the roving
 *    tabindex already computes from `tabs.length`, so five tabs needed nothing
 *    new. The gap was in FIGMA, which ships no five-tab variant — not in the DS.
 *  - The five real labels measure 426.44px of natural width in a 343px row, so
 *    the last tab used to spill 83px past the phone frame, unclipped and
 *    unreachable. `.mn-tabs` had no `overflow-x` at all and the tabs cannot
 *    shrink — `flex-shrink: 1` is defeated by `min-width: auto`, and
 *    "Transactions" is a single word with no wrap point.
 *
 * `isScrollable` is the DS's answer and it is deliberately NOT an MVP wrapper.
 * An outer `overflow-x` div could scroll the row, but only `Tabs` knows which
 * tab is selected, so only `Tabs` can scroll the selected one INTO VIEW on
 * arrow-key navigation. A wrapper fails that silently, with a green build, and
 * three Sections need this behaviour.
 */
const TABS: TabItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'budget', label: 'Budget' },
  { id: 'plans', label: 'Plans' },
  { id: 'receipts', label: 'Receipts' },
]

export function FinanceScreen() {
  const [selected, setSelected] = useState<string>('overview')

  return (
    <div className="mvp-finance">
      {/*
        `HeaderBg variant="compact"` — verified against DS source rather than
        assumed from the name: it renders the status bar, an avatar, a centred
        title and a notification button with its dot badge, over a background
        slot and a scrim. That is node-for-node what Figma's 112-tall `Header`
        draws on this screen.

        The banner and avatar are the SAME two logical slots the Homepage uses,
        resolved through `src/config/media.ts` (Gate 1). Wired here as well as
        on the Homepage on purpose: this header's background box measures
        identically (viewport × 90), and the two were already documented as
        sharing one stand-in fill, so one slot serves both and the two headers
        still "cannot drift apart". The gradient class rides along on the `<img>`
        as its load-failure fallback.

        Note this variant also lays a bottom-up black legibility scrim over the
        image — DS-owned, and the reason the banner README asks for subjects
        composed toward the top.
      */}
      <HeaderBg
        variant="compact"
        background={
          <img className="mvp-finance__header-bg" src={mediaUrl('banner')} alt="" />
        }
        title="Finance"
        avatarName="Margaret"
        avatarSrc={mediaUrl('profile')}
        statusBarTime="9:41"
        hasNotification
      />

      <div className="mvp-finance__tabs">
        <Tabs
          tabs={TABS}
          selectedId={selected}
          onChange={setSelected}
          ariaLabel="Finance sections"
          isScrollable
        />
      </div>

      {selected === 'overview' && <FinanceOverview />}
      {selected === 'transactions' && <TransactionsLedger />}
      {selected === 'budget' && (
        <ComingSoon
          title="Budget"
          description="Set limits by category and track them as you spend."
          icon="icon_budget"
        />
      )}
      {selected === 'plans' && (
        <ComingSoon
          title="Plans"
          description="Goals, savings plans and what it takes to reach them."
          icon="icon_automatic_savings"
        />
      )}
      {selected === 'receipts' && (
        <ComingSoon
          title="Receipts"
          description="Receipts captured and matched to your transactions."
          icon="receipt_long"
        />
      )}
    </div>
  )
}

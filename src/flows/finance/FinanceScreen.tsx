import { useState } from 'react'
import { HeaderBg, Tabs } from '@monarch/design-system'
import type { TabItem } from '@monarch/design-system'
import { ComingSoon } from '../../components/ComingSoon'
import { FinanceOverview } from './FinanceOverview'
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

        The background is the same token gradient the Homepage uses in place of
        Figma's `img/bg01` photograph — a supported slot fill, and it keeps a
        binary asset out of the repo.
      */}
      <HeaderBg
        variant="compact"
        background={<div className="mvp-finance__header-bg" />}
        title="Finance"
        avatarName="Margaret"
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
      {selected === 'transactions' && (
        <ComingSoon
          title="Transactions"
          description="Every movement across your accounts, in one ledger."
          icon="icon_transfer"
        />
      )}
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

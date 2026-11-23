import type { AcademyDestination } from '../../data/academy'
import { FINANCE_TAB_STATE_KEY } from '../finance/financeTabs'
import { TRANSFER_TAB_STATE_KEY } from '../transfer/transferTabs'

/**
 * Where an Academy destination lands, and on which tab — Decision 42's table,
 * through each screen's EXISTING tab-entry mechanism (no new one): Finance reads
 * `financeTab` (Gate 69), the picker reads `transferTab` (Gate 92). Each reads
 * the key once, in its `useState` initialiser.
 */
export function destinationTarget(destination: AcademyDestination): {
  path: string
  state?: Record<string, string>
} {
  switch (destination) {
    case 'transfer':
      return { path: '/transfer', state: { [TRANSFER_TAB_STATE_KEY]: 'bank' } }
    case 'transfer-crypto':
      return { path: '/transfer', state: { [TRANSFER_TAB_STATE_KEY]: 'crypto' } }
    case 'new-recipient':
      return { path: '/transfer/new' }
    case 'finance-overview':
      return { path: '/finance', state: { [FINANCE_TAB_STATE_KEY]: 'overview' } }
    case 'finance-transactions':
      return { path: '/finance', state: { [FINANCE_TAB_STATE_KEY]: 'transactions' } }
    case 'finance-budget':
      return { path: '/finance', state: { [FINANCE_TAB_STATE_KEY]: 'budget' } }
    case 'finance-plans':
      return { path: '/finance', state: { [FINANCE_TAB_STATE_KEY]: 'plans' } }
    case 'finance-receipts':
      return { path: '/finance', state: { [FINANCE_TAB_STATE_KEY]: 'receipts' } }
    case 'settings':
      return { path: '/settings' }
  }
}

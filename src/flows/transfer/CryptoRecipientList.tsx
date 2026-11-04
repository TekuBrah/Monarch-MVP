import { Button, Field, Icon, ListItem } from '@monarch/design-system'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAccounts } from '../../accounts/AccountsProvider'
import { NoResults } from '../../components/NoResults'
import { SectionHeader } from '../../components/SectionHeader'
import { TransactionMark } from '../../components/TransactionMark'
import { CRYPTO_RECIPIENTS } from '../../data/cryptoRecipients'
import {
  cryptoAddressLine,
  filterCryptoRecipients,
  listPresence,
  recentCryptoRecipients,
} from '../../data/derive'
import { raiseNotice } from '../../shell/notices'
import { TRANSFER_TAB_STATE_KEY } from './transferTabs'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE CRYPTO TAB OF THE RECIPIENT PICKER — Gate 96 (Flow 5), Figma `1266:14395`.
 *
 * FOLLOWS ITS OWN DRAWING, WHICH IS NOT THE BANK TAB'S. Here "Recent recipients"
 * is the search field's LABEL, above it (Figma `Input`, label 10 above the
 * field); on the Bank tab (`1266:14391`) the heading sits under the search, over
 * the list. Rendered as the app's `SectionHeader` (the same `body/sm-semibold`
 * subtle face) rather than as a `FormField` label, because it heads the list —
 * it does not describe what to type — and the field keeps its own accessible
 * name, "Search recipients", exactly as the Bank tab's does.
 *
 * Rows: photo, name, the address's ends, no chevron (`hasChevron={false}` is
 * load-bearing — the DS defaults it on). Order: `recentCryptoRecipients`.
 * Search: name or address, with the Bank tab's `NoResults` state.
 *
 * A TAP PUSHES SELECT TOKEN, AFTER REPLACING THIS ENTRY'S STATE WITH THE TAB.
 * The tab is in-screen state, so without that Back would remount the picker on
 * its default Bank tab (the Settings / Home precedent, Gate 87 and R92-3).
 *
 * "+ New recipient" and the bar's Scan QR say "Coming soon." (R96-4, Flow 6).
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function CryptoRecipientList() {
  const location = useLocation()
  const navigate = useNavigate()
  const { transactions } = useAccounts()
  const [search, setSearch] = useState('')
  const visible = recentCryptoRecipients(filterCryptoRecipients(CRYPTO_RECIPIENTS, search), transactions)
  const presence = listPresence(CRYPTO_RECIPIENTS.length, visible.length)

  const open = (recipientId: string) => {
    navigate(location.pathname, {
      replace: true,
      state: { ...((location.state as object | null) ?? {}), [TRANSFER_TAB_STATE_KEY]: 'crypto' },
    })
    navigate(`/transfer/crypto/${recipientId}`)
  }

  return (
    <div className="mvp-transfer__body mvp-transfer__body--crypto mvp-column">
      <div className="mvp-transfer__search">
        <SectionHeader label="Recent recipients" />
        <Field
          value={search}
          onChange={setSearch}
          placeholder="Search recipients"
          ariaLabel="Search recipients"
          sizing="fill"
          leadingIcon={<Icon name="search" size="m" />}
        />
      </div>

      {presence === 'no-results' ? (
        <NoResults
          icon="search"
          title="No recipients match"
          description="Try a name or wallet address."
          actionLabel="Clear search"
          onReset={() => setSearch('')}
        />
      ) : (
        <ul className="mvp-transfer__list" aria-label="Recent recipients">
          {visible.map((r) => (
            <li key={r.id}>
              <ListItem
                type="profile"
                leading={<TransactionMark mark={r.mark} size="l" />}
                title={r.name}
                titleInfo={cryptoAddressLine(r)}
                hasChevron={false}
                onClick={() => open(r.id)}
              />
            </li>
          ))}
        </ul>
      )}

      <Button
        variant="secondary"
        size="l"
        label="New recipient"
        leadingIcon={<Icon name="add" size="l" />}
        onClick={() => raiseNotice('coming-soon')}
      />
    </div>
  )
}

import { Button, HeaderDefault, Icon, ListItem, StatusBar, Tabs, Field } from '@monarch/design-system'
import type { TabItem } from '@monarch/design-system'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ComingSoon } from '../../components/ComingSoon'
import { NoResults } from '../../components/NoResults'
import { SectionHeader } from '../../components/SectionHeader'
import { TransactionMark } from '../../components/TransactionMark'
import { useAccounts } from '../../accounts/AccountsProvider'
import { filterRecipients, listPresence, recentRecipients, recipientAccountLine } from '../../data/derive'
import { RECIPIENTS } from '../../data/recipients'
import { raiseNotice } from '../../shell/notices'
import { requestedTransferTab } from './transferTabs'
import './transfer.css'

const TABS: TabItem[] = [
  { id: 'bank', label: 'Bank' },
  { id: 'crypto', label: 'Crypto' },
]

const TAB_IDS = TABS.map((t) => t.id)

/** Gate 92 — the recipient picker, Figma `1266:14391`. */
export function TransferScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string>(
    () => requestedTransferTab(location.state, TAB_IDS) ?? 'bank',
  )
  const [search, setSearch] = useState('')
  const { transactions } = useAccounts()
  // Gate 93 (DESIGN D10): whoever was sent to most recently comes first. Until
  // the first send this is Figma's own order, so the committed baselines hold.
  const visible = recentRecipients(filterRecipients(RECIPIENTS, search), transactions)
  const presence = listPresence(RECIPIENTS.length, visible.length)

  const back = () => {
    if (location.key === 'default') navigate('/', { replace: true })
    else navigate(-1)
  }

  return (
    <div className="mvp-transfer">
      <StatusBar mode="Light" time="9:41" />
      <HeaderDefault title="Send" hasSubtitle={false} onBack={back} />

      <div className="mvp-transfer__tabs mvp-column">
        <Tabs tabs={TABS} selectedId={selected} onChange={setSelected} ariaLabel="Transfer type" />
      </div>

      {selected === 'bank' && (
        <div className="mvp-transfer__body mvp-column">
          <Field
            value={search}
            onChange={setSearch}
            placeholder="Search recipients"
            ariaLabel="Search recipients"
            sizing="fill"
            leadingIcon={<Icon name="search" size="m" />}
          />

          {presence === 'no-results' ? (
            <NoResults
              icon="search"
              title="No recipients match"
              description="Try a name, account number or bank."
              actionLabel="Clear search"
              onReset={() => setSearch('')}
            />
          ) : (
            <section className="mvp-transfer__recents">
              <SectionHeader label="Recent recipients" />
              <ul className="mvp-transfer__list">
                {visible.map((r) => (
                  <li key={r.id}>
                    <ListItem
                      type="profile"
                      leading={<TransactionMark mark={r.mark} size="l" />}
                      title={r.name}
                      titleInfo={recipientAccountLine(r)}
                      hasChevron={false}
                      onClick={() => navigate(`/transfer/send/${r.id}`)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Button
            variant="secondary"
            size="l"
            label="New recipient"
            leadingIcon={<Icon name="add" size="l" />}
            onClick={() => raiseNotice('coming-soon')}
          />
        </div>
      )}

      {selected === 'crypto' && (
        <ComingSoon
          title="Crypto"
          description="Send crypto to wallets and people. Coming with the crypto transfer flow."
          icon="icon_crypto_transfers"
        />
      )}
    </div>
  )
}

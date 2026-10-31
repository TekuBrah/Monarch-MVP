import { Button, Divider, Icon, IconObject, StatusBar } from '@monarch/design-system'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAccounts } from '../../accounts/AccountsProvider'
import { cashAccountLine, recipientAccountLine } from '../../data/derive'
import { formatMyr, formatTimestamp } from '../../data/format'
import { RECIPIENTS } from '../../data/recipients'
import { TODAY } from '../../data/today'
import { FINANCE_TAB_STATE_KEY, OPEN_TRANSACTION_STATE_KEY } from '../finance/financeTabs'
import './transfer.css'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * "TRANSFER SUCCESSFUL" — Gate 93, the success page (Decision 19B; R93-6).
 * UNDRAWN: built from this app's own parts.
 *
 * A ROUTE, `/transfer/done/:transactionId`, reached by REPLACING the amount
 * screen, so device Back lands on the picker and the send cannot be offered
 * twice. The id is in the URL rather than in location state so the page reads
 * its row back after a reload — the row persists (Gate 85).
 *
 * AN ID THAT NAMES NO ROW, OR A ROW THAT IS NOT A SEND (no `recipientId`),
 * GOES HOME. That is what keeps this page from describing a Top-Up or a seeded
 * row as a transfer someone just made.
 *
 * NO REFERENCE ON THE PAGE (fork X2). Its last six characters are random, so no
 * walk state could photograph it, and it is one tap away in View transaction.
 *
 * NO BACK CONTROL. Done goes home (replace); View transaction opens that row's
 * detail sheet on the Transactions tab (replace too: both leave the flow).
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function TransferDoneScreen() {
  const { transactionId } = useParams()
  const navigate = useNavigate()
  const { transactions, fiatAccounts, holdings } = useAccounts()

  const row = transactions.find((t) => t.id === transactionId)
  const recipient = row?.recipientId ? RECIPIENTS.find((r) => r.id === row.recipientId) : undefined
  const account = row ? fiatAccounts.find((a) => a.id === row.accountId) : undefined
  if (!row || !recipient || !account) return <Navigate to="/" replace />

  return (
    <div className="mvp-transfer-done">
      <StatusBar mode="Light" time="9:41" />
      <div className="mvp-transfer-done__body mvp-column">
        <div className="mvp-transfer-done__hero" role="status">
          <IconObject color="green" shape="circle" size="xxl">
            <Icon name="check" size="l" />
          </IconObject>
          <h1 className="mvp-transfer-done__title type-header-h6">Transfer successful</h1>
          <p className="mvp-transfer-done__amount type-header-h4">{formatMyr(-row.amount)}</p>
          <p className="mvp-transfer-done__to type-body-m">to {recipient.name}</p>
        </div>

        <Divider />

        <dl className="mvp-transfer-done__rows">
          <div className="mvp-transfer-done__row">
            <dt className="type-body-sm">From</dt>
            <dd className="type-body-m-medium">{`${account.name} · ${cashAccountLine(holdings, account)}`}</dd>
          </div>
          <div className="mvp-transfer-done__row">
            <dt className="type-body-sm">To</dt>
            <dd className="type-body-m-medium">{recipientAccountLine(recipient)}</dd>
          </div>
          <div className="mvp-transfer-done__row">
            <dt className="type-body-sm">Date</dt>
            <dd className="type-body-m-medium">{formatTimestamp(row.occurredAt, TODAY.getFullYear())}</dd>
          </div>
        </dl>

        <Divider />

        <div className="mvp-transfer-done__actions">
          <Button variant="primary" size="l" label="Done" onClick={() => navigate('/', { replace: true })} />
          <Button
            variant="tertiary"
            size="l"
            label="View transaction"
            onClick={() =>
              navigate('/finance', {
                replace: true,
                state: { [FINANCE_TAB_STATE_KEY]: 'transactions', [OPEN_TRANSACTION_STATE_KEY]: row.id },
              })
            }
          />
        </div>
      </div>
    </div>
  )
}

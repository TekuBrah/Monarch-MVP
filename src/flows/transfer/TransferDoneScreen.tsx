import { Button, Divider, Icon, IconObject, StatusBar } from '@monarch/design-system'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAccounts } from '../../accounts/AccountsProvider'
import { CRYPTO_RECIPIENTS } from '../../data/cryptoRecipients'
import { cashAccountLine, cryptoSendAddressLine, recipientAccountLine } from '../../data/derive'
import { formatMyr, formatQuantity, formatTimestamp } from '../../data/format'
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
  const { transactions, fiatAccounts, holdings, cryptoHoldings, cryptoWallets } = useAccounts()

  const row = transactions.find((t) => t.id === transactionId)

  /*
    GATE 98 — A CRYPTO SEND (fork F-d: one success page, branching on the row).
    It prints the token quantity as the headline, the wallet as From, the
    address on the token's network as To, and the fee in both currencies. Still
    no reference (fork X2). A row with no `crypto` detail is not a send.
  */
  if (row?.method === 'Crypto Transfer') {
    const detail = row.crypto
    const to = CRYPTO_RECIPIENTS.find((r) => r.id === row.recipientId)
    const token = detail ? cryptoHoldings.find((h) => h.id === detail.tokenId) : undefined
    const wallet = cryptoWallets.find((w) => w.id === row.accountId)
    if (!detail || !to || !token || !wallet) return <Navigate to="/" replace />
    const q = (n: number) => formatQuantity(n, token.quantityDecimals, token.symbol)
    return (
      <DoneLayout
        amount={q(detail.quantity)}
        to={to.name}
        rows={[
          ['From', wallet.name],
          ['To', cryptoSendAddressLine(to, token)],
          ['Network fee', `${q(detail.feeQuantity)} • ${formatMyr(detail.fee)}`],
          ['Total', formatMyr(-row.amount)],
          ['Date', formatTimestamp(row.occurredAt, TODAY.getFullYear())],
        ]}
        rowId={row.id}
      />
    )
  }

  const recipient = row?.recipientId ? RECIPIENTS.find((r) => r.id === row.recipientId) : undefined
  const account = row ? fiatAccounts.find((a) => a.id === row.accountId) : undefined
  if (!row || !recipient || !account) return <Navigate to="/" replace />

  return (
    <DoneLayout
      amount={formatMyr(-row.amount)}
      to={recipient.name}
      rows={[
        ['From', `${account.name} · ${cashAccountLine(holdings, account)}`],
        ['To', recipientAccountLine(recipient)],
        ['Date', formatTimestamp(row.occurredAt, TODAY.getFullYear())],
      ]}
      rowId={row.id}
    />
  )
}

/** The page's one layout, shared by a bank send and a crypto send (Gate 98). */
function DoneLayout(props: { amount: string; to: string; rows: [string, string][]; rowId: string }) {
  const navigate = useNavigate()
  return (
    <div className="mvp-transfer-done">
      <StatusBar mode="Light" time="9:41" />
      <div className="mvp-transfer-done__body mvp-column">
        <div className="mvp-transfer-done__hero" role="status">
          <IconObject color="green" shape="circle" size="xxl">
            <Icon name="check" size="l" />
          </IconObject>
          <h1 className="mvp-transfer-done__title type-header-h6">Transfer successful</h1>
          <p className="mvp-transfer-done__amount type-header-h4">{props.amount}</p>
          <p className="mvp-transfer-done__to type-body-m">to {props.to}</p>
        </div>

        <Divider />

        <dl className="mvp-transfer-done__rows">
          {props.rows.map(([label, value]) => (
            <div key={label} className="mvp-transfer-done__row">
              <dt className="type-body-sm">{label}</dt>
              <dd className="type-body-m-medium">{value}</dd>
            </div>
          ))}
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
                state: { [FINANCE_TAB_STATE_KEY]: 'transactions', [OPEN_TRANSACTION_STATE_KEY]: props.rowId },
              })
            }
          />
        </div>
      </div>
    </div>
  )
}

import {
  Avatar,
  Button,
  ElementWrapper,
  FormField,
  HeaderDefault,
  Logo,
  Menu,
  MenuItem,
  SelectTransfer,
  SelectWalletAccount,
  StatusBar,
  TransferAmount,
} from '@monarch/design-system'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAccounts } from '../../accounts/AccountsProvider'
import { TransactionMark } from '../../components/TransactionMark'
import { accountMarkUrl, mediaUrl } from '../../config/media'
import {
  buildSend,
  cashAccountLine,
  recipientAccountLine,
  sendAmountInput,
  sendAmountSen,
  transferAmountError,
} from '../../data/derive'
import { formatMyr } from '../../data/format'
import { RECIPIENTS } from '../../data/recipients'
import { raiseNotice } from '../../shell/notices'
import { useTouchedValidation } from '../finance/useTouchedValidation'
import { ReviewTransferSheet } from './ReviewTransferSheet'
import { useTransferDraft } from './transferDraft'
import './transfer.css'

/**
 * EACH CASH ACCOUNT'S LEADING MARK — Gate 93 (R93-3). Main's is Margaret's
 * profile photograph (the `profile` slot), as Figma draws it; Joint's is DS
 * `192:8180`, drawn through `Avatar src` like any photo. Keyed by account id
 * because the mark is a property of the account, which `FiatAccount` does not
 * carry — and widening it would move the seed fingerprint.
 */
function accountMark(accountId: string): string {
  return accountId === 'joint' ? accountMarkUrl('joint-account.svg') : mediaUrl('profile')
}

/** Location state that says the review sheet is open — a history entry of its own. */
const REVIEW_STATE_KEY = 'review'

function isReviewState(state: unknown): boolean {
  return typeof state === 'object' && state !== null
    ? (state as Record<string, unknown>)[REVIEW_STATE_KEY] === true
    : false
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE AMOUNT SCREEN — Gate 93 (Flow 4), Figma `1266:14392` (and `1266:14393`,
 * the From dropdown open).
 *
 * From, To, the amount and the balance it leaves, then "Transfer money". The
 * header reads "Send money", NOT the picker's "Send" (Figma).
 *
 * "Main" AND NOT "Main Account" (Teku's Decision 26 = B): one name for one
 * account, everywhere. Figma's "Main Account" is a recorded divergence.
 *
 * THE FROM MENU'S DISMISSAL IS THE DS'S OWN (v2.12.0, R93-4): Escape, an
 * outside press and focus leaving close it, and focus returns to the trigger
 * after Escape or a pick. This screen adds no listener of its own.
 *
 * THE TO FIELD IS A DETACHED FRAME IN FIGMA, and its chevron is drawn on
 * `1266:14392` only. Its job here (registered) is to go back to the picker with
 * the draft kept, so the whole control is that button: `SelectWalletAccount`
 * pinned closed, its open request turned into the navigation.
 *
 * THE REVIEW IS A HISTORY ENTRY (R93-5): "Transfer money" pushes this same path
 * with `{ review: true }`, so ✕, Escape, the scrim AND device Back all return
 * here with everything kept. "Transfer now" writes the row, pops that entry and
 * then REPLACES this screen with the success page, so Back from the success
 * page lands on the picker (R93-6) and can never re-offer the same money.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function SendScreen() {
  const { recipientId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { fiatAccounts, primaryAccount, holdings, transactions, sendMoney } = useAccounts()
  const draft = useTransferDraft()
  const [fromOpen, setFromOpen] = useState(false)
  const [fromSearch, setFromSearch] = useState('')
  const [sentId, setSentId] = useState<string | null>(null)

  const recipient = RECIPIENTS.find((r) => r.id === recipientId)
  const from = fiatAccounts.find((a) => a.id === (draft.fromId ?? primaryAccount.id)) ?? primaryAccount
  const error = transferAmountError(draft.amount, from.balance)
  const errors = { amount: error !== null }
  const validation = useTouchedValidation(errors)

  // The success page is reached only once the review's own history entry has
  // been popped, so the replace lands on THIS screen's entry, not the review's.
  const reviewInHistory = isReviewState(location.state)
  if (sentId !== null && !reviewInHistory) {
    return <Navigate to={`/transfer/done/${sentId}`} replace />
  }

  // REGISTERED: an id naming no recipient goes back to the picker.
  if (!recipient) return <Navigate to="/transfer" replace />

  const inApp = location.key !== 'default'
  const toPicker = () => {
    if (inApp) navigate(-1)
    else navigate('/transfer', { replace: true })
  }

  const amountSen = sendAmountSen(draft.amount)
  const newBalance = (Math.round(from.balance * 100) - amountSen) / 100
  // A history entry carrying `review` that a reload restored with no valid
  // amount behind it shows nothing — there is nothing to review.
  const isReviewOpen = reviewInHistory && error === null && sentId === null

  const openReview = () => {
    if (!validation.attempt()) return
    navigate(location.pathname, { state: { ...(location.state as object), [REVIEW_STATE_KEY]: true } })
  }

  const confirm = () => {
    const row = buildSend({
      recipient,
      accountId: from.id,
      amountSen,
      now: new Date(),
      transactions,
    })
    sendMoney(row)
    draft.clear()
    setSentId(row.id)
    navigate(-1)
  }

  const accountNeedle = fromSearch.trim().toLowerCase()
  const accountRows = fiatAccounts.filter((a) =>
    `${a.name} ${cashAccountLine(holdings, a)}`.toLowerCase().includes(accountNeedle),
  )

  const isAmountShown = validation.isShown('amount')

  return (
    <div className="mvp-send">
      <StatusBar mode="Light" time="9:41" />
      <HeaderDefault title="Send money" hasSubtitle={false} onBack={toPicker} />

      <div ref={validation.formRef} className="mvp-send__body mvp-column" onBlur={validation.onBlur}>
        <div className="mvp-send__parties">
          <FormField type="default" label="From">
            <SelectWalletAccount
              appearance="standard"
              state="filled"
              sizing="fill"
              leadingSlot={<Avatar size="l" src={accountMark(from.id)} />}
              labelCrypto={from.name}
              labelWallet={cashAccountLine(holdings, from)}
              labelAmount={formatMyr(from.balance)}
              isOpen={fromOpen}
              onOpenChange={(open) => {
                setFromOpen(open)
                if (!open) setFromSearch('')
              }}
              menuSlot={
                <Menu
                  searchBar
                  searchPlaceholder="Search accounts"
                  searchAriaLabel="Search accounts"
                  searchValue={fromSearch}
                  onSearchChange={setFromSearch}
                  listAriaLabel="From account"
                  slotContent={accountRows.map((a) => (
                    <MenuItem
                      key={a.id}
                      id={`from-${a.id}`}
                      type="account"
                      label={a.name}
                      avatarSrc={accountMark(a.id)}
                      trailingLabel={formatMyr(a.balance)}
                      isSelected={a.id === from.id}
                      onSelect={() => {
                        draft.setFromId(a.id)
                        setFromOpen(false)
                        setFromSearch('')
                      }}
                    />
                  ))}
                />
              }
            />
          </FormField>

          <FormField type="default" label="To">
            <SelectWalletAccount
              appearance="standard"
              state="filled"
              sizing="fill"
              leadingSlot={<TransactionMark mark={recipient.mark} size="l" />}
              labelCrypto={recipient.name}
              labelWallet={recipientAccountLine(recipient)}
              isOpen={false}
              onOpenChange={toPicker}
            />
          </FormField>
        </div>

        <div className="mvp-send__amount">
          <div data-field="amount">
            <FormField
              type="transfer"
              label="Transfer Amount"
              error={isAmountShown && error ? error : undefined}
            >
              <SelectTransfer
                appearance="attention"
                isSelected
                sizing="fill"
                value={draft.amount === '' ? '' : `RM ${draft.amount}`}
                placeholder="RM 0.00"
                onAmountChange={(raw) => draft.setAmount(sendAmountInput(raw))}
                isOpen={false}
                isInvalid={isAmountShown}
                currencyLabel="MYR"
                currencyFlag={
                  <ElementWrapper size="m">
                    {/* xs (14px): the DS ships no Logo size for Figma's 20px flag slot
                        (`m` is 40 and overflows it). Register G61; not overridden here. */}
                    <Logo name="flag" size="xs" />
                  </ElementWrapper>
                }
                onCurrencyClick={() => raiseNotice('coming-soon')}
              />
            </FormField>
          </div>
          {error === null && (
            <div className="mvp-send__balance">
              <TransferAmount
                type="currency"
                items={[{ title: 'Your new balance', amount: formatMyr(newBalance) }]}
              />
            </div>
          )}
        </div>

        <Button variant="primary" size="l" label="Transfer money" onClick={openReview} />
      </div>

      <ReviewTransferSheet
        isOpen={isReviewOpen}
        onClose={() => navigate(-1)}
        onConfirm={confirm}
        amount={amountSen / 100}
        recipient={recipient}
        fromLabel={`${from.name} · ${cashAccountLine(holdings, from)}`}
        newBalance={newBalance}
      />
    </div>
  )
}

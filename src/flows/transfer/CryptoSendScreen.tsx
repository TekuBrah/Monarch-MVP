import {
  Button,
  Divider,
  ElementWrapper,
  FormField,
  HeaderDefault,
  Logo,
  SelectTransfer,
  SelectWalletAccount,
  StatusBar,
  TransferAmount,
} from '@monarch/design-system'
import { Fragment, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAccounts } from '../../accounts/AccountsProvider'
import { TransactionMark } from '../../components/TransactionMark'
import { CRYPTO_RECIPIENTS } from '../../data/cryptoRecipients'
import type { FeeTier } from '../../data/cryptoNetworks'
import {
  buildCryptoSend,
  cryptoAmountError,
  cryptoFee,
  cryptoNetworkLine,
  cryptoQuantityForSen,
  cryptoSendAddressLine,
  cryptoUnits,
  cryptoWalletTotal,
  holdingsAfterCryptoSend,
  sendAmountInput,
  sendAmountSen,
  walletHoldings,
  CRYPTO_UNITS_PER_TOKEN,
} from '../../data/derive'
import { formatMyr, formatQuantity } from '../../data/format'
import { useTouchedValidation } from '../finance/useTouchedValidation'
import { NetworkFeeSheet } from './NetworkFeeSheet'
import { useTransferDraft } from './transferDraft'
import { TRANSFER_TAB_STATE_KEY } from './transferTabs'
import './transfer.css'

/** Location state flags: each is a history entry of its own (Decision 28A, fork F-f). */
const FEE_STATE_KEY = 'fee'
const SUMMARY_STATE_KEY = 'summary'

function flag(state: unknown, key: string): boolean {
  return typeof state === 'object' && state !== null ? (state as Record<string, unknown>)[key] === true : false
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SEND CRYPTO — THE AMOUNT SCREEN IN THREE STATES — Gate 98 (Flow 5), Figma
 * `1266:14397` (amount, "Next"), `1266:14399` (the Network Fee sheet over it)
 * and `1266:14398` (the same screen grown in place, "Transfer crypto").
 *
 * DECISION 28A, AND ITS HISTORY (fork F-f). "Next" pushes this same path with
 * `{ fee: true }`: the sheet is open while that entry is current, so Cancel,
 * ✕, the scrim AND device Back return to the amount with the draft kept. OK
 * REPLACES that entry with `{ summary: true }` — the summary is its own entry,
 * so header Back and device Back from it return to the editable amount, and
 * the sheet is never re-entered by Back. "Transfer crypto" writes, pops the
 * summary and then REPLACES this screen with the success page, as Flow 4 does.
 *
 * THE SUMMARY IS DERIVED FROM THE DRAFT. The amount field stays live in it (the
 * drawn field is there; only the keypad goes); an edit recomputes the four
 * rows, and an amount that no longer fits shows the field's error and
 * "Transfer crypto" refuses. Nothing is re-offered or held stale.
 *
 * THE AMOUNT IS TYPED IN RM (R96-5); the caption is the token quantity at the
 * token's own decimals (DS v2.13.0 `SelectTransfer caption`, G64).
 *
 * "Send <Token>" WITH THE TOKEN IN THE ACCENT (G65, Decision 32A).
 *
 * FROM IS THE TOKEN, SO ITS CHEVRON AND THE AMOUNT CHIP'S BOTH RETURN TO SELECT
 * TOKEN (R96-8, fork F-j): one place chooses a token.
 *
 * TO IS THE CONTACT, AS FLOW 4 DRAWS IT (Decision 34, recommended): photo,
 * name and the address on this token's network (Decision 33); its open request
 * returns to the Crypto tab with the draft kept. Decision 30F's helper line sits
 * under it.
 *
 * A DEEP LINK OR A RELOAD HAS NO CONTACT IN THE DRAFT, and replaces itself with
 * the Crypto tab (R93-7's rule, R96-9). The draft is an unsent send, not a record.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function CryptoSendScreen() {
  const { tokenId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { cryptoWallets, cryptoHoldings, sendCrypto } = useAccounts()
  const draft = useTransferDraft()
  const [pendingTier, setPendingTier] = useState<FeeTier>(draft.crypto.tier)
  const [sentId, setSentId] = useState<string | null>(null)

  const holding = cryptoHoldings.find((h) => h.id === tokenId)
  const recipient = CRYPTO_RECIPIENTS.find((r) => r.id === draft.crypto.recipientId)
  const fee = holding ? cryptoFee(holding.id, draft.crypto.tier) : null
  const error = holding && fee ? cryptoAmountError(draft.crypto.amount, holding, fee) : null
  const validation = useTouchedValidation({ amount: error !== null })

  const inFee = flag(location.state, FEE_STATE_KEY)
  const inSummary = flag(location.state, SUMMARY_STATE_KEY)

  // The write clears the draft before the summary entry pops; render nothing in
  // between, then REPLACE this screen with the success page on its own entry.
  if (sentId !== null) return inSummary ? null : <Navigate to={`/transfer/done/${sentId}`} replace />

  if (!holding || !fee || !recipient) {
    return <Navigate to="/transfer" replace state={{ [TRANSFER_TAB_STATE_KEY]: 'crypto' }} />
  }
  const wallet = cryptoWallets.find((w) => w.id === holding.walletId)!

  const inApp = location.key !== 'default'
  const back = () => {
    if (inSummary || inApp) navigate(-1)
    else navigate(`/transfer/crypto/${recipient.id}`, { replace: true })
  }
  // From and the amount chip: the token is chosen on Select Token.
  const toSelectToken = () => {
    if (inSummary) navigate(-2)
    else back()
  }
  const toPicker = () => navigate('/transfer', { state: { [TRANSFER_TAB_STATE_KEY]: 'crypto' } })

  const amountSen = sendAmountSen(draft.crypto.amount)
  const sentQuantity = cryptoQuantityForSen(holding.id, amountSen)
  const after = holdingsAfterCryptoSend(cryptoHoldings, {
    tokenId: holding.id,
    quantity: sentQuantity,
    feeQuantity: inSummary ? fee.quantity : 0,
  })
  const tokenAfter = after.find((h) => h.id === holding.id)!
  const walletAfter = cryptoWalletTotal(walletHoldings(after, wallet.id))
  const qty = (q: number) => formatQuantity(q, holding.quantityDecimals, holding.symbol)
  const totalQuantity = (cryptoUnits(sentQuantity) + cryptoUnits(fee.quantity)) / CRYPTO_UNITS_PER_TOKEN

  const rows = [
    ...(inSummary
      ? [
          { title: 'Network Fees', amountDetails: qty(fee.quantity), amount: formatMyr(fee.fee) },
          { title: 'Total', amountDetails: qty(totalQuantity), amount: formatMyr((amountSen + Math.round(fee.fee * 100)) / 100) },
        ]
      : []),
    { title: 'Your new balance', amount: formatMyr(walletAfter) },
    { title: `${holding.symbol} balance`, amountDetails: qty(tokenAfter.quantity), amount: formatMyr(tokenAfter.valueMyr) },
  ]

  const openFee = () => {
    if (!validation.attempt()) return
    setPendingTier(draft.crypto.tier)
    navigate(location.pathname, { state: { ...(location.state as object), [FEE_STATE_KEY]: true } })
  }
  const commitFee = () => {
    draft.setCryptoTier(pendingTier)
    navigate(location.pathname, {
      replace: true,
      state: { ...(location.state as object), [FEE_STATE_KEY]: false, [SUMMARY_STATE_KEY]: true },
    })
  }
  const confirm = () => {
    if (!validation.attempt()) return
    const row = buildCryptoSend({ recipient, holding, amountSen, tier: draft.crypto.tier, now: new Date() })
    sendCrypto(row)
    draft.clear()
    setSentId(row.id)
    navigate(-1)
  }

  const isAmountShown = validation.isShown('amount')

  return (
    <div className="mvp-crypto-send">
      <StatusBar mode="Light" time="9:41" />
      <HeaderDefault title="Send" titleAccent={holding.name} hasSubtitle={false} onBack={back} />

      <div ref={validation.formRef} className="mvp-crypto-send__body mvp-column" onBlur={validation.onBlur}>
        <div className="mvp-crypto-send__parties">
          <FormField type="default" label="From">
            <SelectWalletAccount
              appearance="standard"
              state="filled"
              sizing="fill"
              leadingSlot={<Logo name={holding.logo} size="m" />}
              labelCrypto={holding.name}
              labelWallet={wallet.name}
              labelAmount={formatMyr(holding.valueMyr)}
              labelAmtCrypto={qty(holding.quantity)}
              isOpen={false}
              onOpenChange={toSelectToken}
            />
          </FormField>
          <FormField type="default" label="To" helper={cryptoNetworkLine(holding)}>
            <SelectWalletAccount
              appearance="standard"
              state="filled"
              sizing="fill"
              leadingSlot={<TransactionMark mark={recipient.mark} size="l" />}
              labelCrypto={recipient.name}
              labelWallet={cryptoSendAddressLine(recipient, holding)}
              isOpen={false}
              onOpenChange={toPicker}
            />
          </FormField>
        </div>

        <div className="mvp-crypto-send__amount">
          <div data-field="amount">
            <FormField type="transfer" label="Transfer Amount" error={isAmountShown && error ? error : undefined}>
              <SelectTransfer
                appearance="attention"
                isSelected
                sizing="fill"
                caption={qty(sentQuantity)}
                value={draft.crypto.amount === '' ? '' : `RM ${draft.crypto.amount}`}
                placeholder="RM 0.00"
                onAmountChange={(raw) => draft.setCryptoAmount(sendAmountInput(raw))}
                isOpen={false}
                isInvalid={isAmountShown}
                currencyLabel={holding.symbol}
                currencyFlag={
                  <ElementWrapper size="m">
                    <Logo name={holding.logo} size="fill" />
                  </ElementWrapper>
                }
                onCurrencyClick={toSelectToken}
              />
            </FormField>
          </div>
          {error === null && (
            <div className="mvp-crypto-send__rows">
              {rows.map((item, i) => (
                <Fragment key={item.title}>
                  {i > 0 && <Divider />}
                  <TransferAmount type="crypto" items={[item]} />
                </Fragment>
              ))}
            </div>
          )}
        </div>

        <Button
          variant="primary"
          size="l"
          label={inSummary ? 'Transfer crypto' : 'Next'}
          onClick={inSummary ? confirm : openFee}
        />
      </div>

      <NetworkFeeSheet
        isOpen={inFee && error === null}
        holding={holding}
        tier={pendingTier}
        onTierChange={setPendingTier}
        onOk={commitFee}
        onCancel={() => navigate(-1)}
      />
    </div>
  )
}

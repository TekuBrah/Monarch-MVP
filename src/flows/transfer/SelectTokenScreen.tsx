import { Button, FieldMessage, HeaderDefault, Logo, MenuItem, StatusBar } from '@monarch/design-system'
import { useState, type FocusEvent, type KeyboardEvent } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAccounts } from '../../accounts/AccountsProvider'
import { CRYPTO_RECIPIENTS } from '../../data/cryptoRecipients'
import { walletHoldings } from '../../data/derive'
import { formatMyr, formatQuantity } from '../../data/format'
import { raiseNotice } from '../../shell/notices'
import { useTouchedValidation } from '../finance/useTouchedValidation'
import { TRANSFER_TAB_STATE_KEY } from './transferTabs'
import './transfer.css'

const TOKEN_MESSAGE_ID = 'select-token-message'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SELECT TOKEN — Gate 96 (Flow 5), Figma `1266:14396`, at
 * `/transfer/crypto/:recipientId` (R96-9).
 *
 * THE ROWS ARE THE SIX REAL HOLDINGS, NOT THE FRAME'S FIVE (R96-8, a recorded
 * divergence). Grouped by wallet in `cryptoWallets` order, with the MVP's wallet
 * names ("Marge's Wallet", "Fun Wallet" — Flow 7) and Flow 7's values, through
 * `walletHoldings`, `formatMyr` and `formatQuantity` — never re-typed. The frame
 * draws "Marg's Wallet" / "Fun Tokens" and RM 5,117.70 for Stellar and Uniswap,
 * the pre-Flow-7 figures, and has no Solana.
 *
 * THE ROW IS DS `MenuItem type="crypto"`, NOT `ListItem`. Figma draws `Item/list`
 * with no selected state; the DS's only crypto row WITH one is `MenuItem`'s,
 * whose four labels are exactly the drawn row's (token, wallet, value,
 * quantity). Its selected treatment is `.mn-menu-item--selected`: a 10% primary
 * tint and primary text. Its unselected surface is
 * `--mapped-surface-primary-default-subtle`, which equals the page surface in
 * both themes, so the rows sit flat on the page as drawn. Its 12px padding is
 * what makes the drawn 44px rows land on Figma's 68 pitch with no gap.
 *
 * SELECTION IS UNDRAWN (thread ruling): nothing pre-selected; a tap selects;
 * "Next" is never disabled. With nothing chosen, "Choose a token to send."
 * shows once the list is left or Next is pressed (Gate 71-B's touched rule, the
 * hook Flow 4 reuses), and a press moves focus to the first token. With a token chosen, Next
 * says "Coming soon." — the amount screen is Gate 98's.
 *
 * KEYBOARD: one tab stop (the selected token, else the first); arrows, Home and
 * End move focus; Enter or Space selects — `Menu`'s own roving model, written
 * here because `Menu` paints a floating panel the page must not have.
 *
 * Back (header or device) returns to the picker, on its Crypto tab: the picker
 * wrote that tab into its own history entry before pushing. Opened directly,
 * Back replaces itself with the picker's Crypto tab (R93-7). An id naming no
 * contact does the same (R93-10).
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function SelectTokenScreen() {
  const { recipientId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { cryptoWallets, cryptoHoldings } = useAccounts()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const validation = useTouchedValidation({ token: selectedId === null })

  const recipient = CRYPTO_RECIPIENTS.find((r) => r.id === recipientId)
  if (!recipient) {
    return <Navigate to="/transfer" replace state={{ [TRANSFER_TAB_STATE_KEY]: 'crypto' }} />
  }

  const back = () => {
    if (location.key !== 'default') navigate(-1)
    else navigate('/transfer', { replace: true, state: { [TRANSFER_TAB_STATE_KEY]: 'crypto' } })
  }

  const rows = cryptoWallets.flatMap((wallet) =>
    walletHoldings(cryptoHoldings, wallet.id).map((holding) => ({ wallet, holding })),
  )
  const tabStopId = selectedId ?? rows[0]?.holding.id
  const showMessage = validation.isShown('token')

  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const options = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="option"]'))
    if (options.length === 0) return
    const current = options.findIndex((el) => el === document.activeElement)
    let next: number
    switch (event.key) {
      case 'ArrowDown':
        next = current === -1 ? 0 : Math.min(options.length - 1, current + 1)
        break
      case 'ArrowUp':
        next = current === -1 ? 0 : Math.max(0, current - 1)
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = options.length - 1
        break
      default:
        return
    }
    event.preventDefault()
    options[next].focus()
  }

  /*
    A FAILED "Next" FOCUSES THE LIST (the touched-validation hook focuses the
    first `aria-invalid` element), and the list hands that focus straight to its
    tab stop — the selected token, else the first — so focus lands on an option
    the user can act on and the list box itself never wears a focus outline.
  */
  const onListFocus = (event: FocusEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return
    event.currentTarget.querySelector<HTMLElement>('[role="option"][tabindex="0"]')?.focus()
  }

  const onNext = () => {
    if (!validation.attempt()) return
    raiseNotice('coming-soon')
  }

  return (
    <div className="mvp-token">
      <StatusBar mode="Light" time="9:41" />
      <HeaderDefault title="Select Token" subtitle="Enter Transfer Details" hasSubtitle onBack={back} />

      <div ref={validation.formRef} onBlur={validation.onBlur} className="mvp-token__body">
        <div
          role="listbox"
          aria-label="Tokens"
          aria-invalid={showMessage}
          aria-describedby={showMessage ? TOKEN_MESSAGE_ID : undefined}
          data-field="token"
          tabIndex={-1}
          className="mvp-token__list"
          onKeyDown={onListKeyDown}
          onFocus={onListFocus}
        >
          {rows.map(({ wallet, holding }) => (
            <MenuItem
              key={holding.id}
              id={`token-${holding.id}`}
              type="crypto"
              isSelected={selectedId === holding.id}
              tabIndex={tabStopId === holding.id ? 0 : -1}
              iconSlot={<Logo name={holding.logo} size="m" />}
              labelCrypto={holding.name}
              labelWallet={wallet.name}
              labelAmount={formatMyr(holding.valueMyr)}
              labelAmountCrypto={formatQuantity(holding.quantity, holding.quantityDecimals, holding.symbol)}
              onSelect={() => setSelectedId(holding.id)}
            />
          ))}
        </div>
        {showMessage && (
          <div className="mvp-token__message">
            <FieldMessage tone="error" id={TOKEN_MESSAGE_ID}>
              Choose a token to send.
            </FieldMessage>
          </div>
        )}
      </div>

      <div className="mvp-token__actions">
        <Button variant="primary" size="l" label="Next" onClick={onNext} />
      </div>
    </div>
  )
}

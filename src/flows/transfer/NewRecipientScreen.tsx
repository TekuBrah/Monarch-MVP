import { Button, Field, HeaderDefault, OptionList, Select, StatusBar } from '@monarch/design-system'
import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAccounts } from '../../accounts/AccountsProvider'
import { BANK_DIRECTORY } from '../../data/bankDirectory'
import { BANKS } from '../../data/banks'
import {
  accountNumberInput,
  accountNumberProblem,
  bankGroups,
  buildRecipient,
  lookupAccount,
} from '../../data/derive'
import { currentNotice, dismissNotice, raiseNotice } from '../../shell/notices'
import { useTouchedValidation } from '../finance/useTouchedValidation'
import {
  ACCOUNT_TYPE_OPTIONS,
  OTHER_DETAILS_MAX,
  REFERENCE_OPTIONS,
  TRANSFER_TO_OPTIONS,
  TRANSFER_TYPE_OPTIONS,
  optionLabel,
  type FormOption,
} from './newRecipientOptions'
import { useTransferDraft, type NewRecipientDraft } from './transferDraft'
import './transfer.css'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ADD A NEW BANK RECIPIENT — Gate 101 (Flow 6), Figma `1266:14385` (Select
 * Transfer Type), `1266:14386` (Select recipient bank), `1266:14387` (Enter
 * recipient details).
 *
 * ONE ROUTE, `/transfer/new`, AND EACH STEP IS ITS OWN HISTORY ENTRY (R101-1).
 * A step pushes this same path with `{ newRecipientStep }` in location state —
 * the Gate 93 review-entry shape — so device Back walks back one step at a time
 * and THIS COMPONENT STAYS MOUNTED across all three. That is what makes the
 * save safe:
 *
 *   Next saves the recipient, then pops back to the FIRST step's entry
 *   (`navigate(-2)`) and REPLACES it with the amount screen. The three steps are
 *   then gone from history, so device Back from the amount screen lands on the
 *   recipient picker — never on a live form whose Next could save a duplicate —
 *   and Flow 4's To field, which goes back with `navigate(-1)`, still reaches the
 *   picker unchanged (R93-7).
 *
 * THE PENDING FIELDS LIVE IN THE TRANSFER DRAFT (`newRecipient`), not here: a
 * reload drops the draft, and a step that needs it then replaces itself with
 * the first step (the Flow 4 standard for a deep link without a draft).
 *
 * A FIELD WHOSE VALUE WAS CHOSEN ON AN EARLIER STEP GOES BACK TO THAT STEP
 * (R101-2): Transfer to returns to Select Transfer Type, Recipient Bank to the
 * bank list — Flow 4's To-field rule (R93-7) and Decision 34D's, applied here.
 * EVERY `Select` HERE IS FIGMA'S `state=Filled` — grey border, value shown —
 * so none passes `isSelected`, which is the DS's `Selected` state (a persistent
 * blue border and glow) and is not what `1266:14387` draws.
 *
 * The three undrawn choices (Account Type, Transfer Type, Recipient Reference)
 * open a picker view: the Gate 74-B dropdown-in-form pattern on a page — the
 * header names the task, back returns to the form, flat full-bleed rows, no
 * inner container, and the picker is a history entry so device Back closes it.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type Step = 'type' | 'bank' | 'details'
type Picker = 'accountType' | 'transferType' | 'reference'

const STEP_KEY = 'newRecipientStep'
const PICKER_KEY = 'newRecipientPicker'

function readState(state: unknown): { step: Step; picker: Picker | null } {
  const rec = typeof state === 'object' && state !== null ? (state as Record<string, unknown>) : {}
  const step = rec[STEP_KEY] === 'bank' || rec[STEP_KEY] === 'details' ? rec[STEP_KEY] : 'type'
  const p = rec[PICKER_KEY]
  const picker = p === 'accountType' || p === 'transferType' || p === 'reference' ? p : null
  return { step, picker: step === 'details' ? picker : null }
}

const SUBTITLE: Record<Step, string> = {
  type: 'Select Transfer Type',
  bank: 'Select recipient bank',
  details: 'Enter recipient details',
}

const PICKERS: Record<Picker, { subtitle: string; options: FormOption[]; field: keyof NewRecipientDraft }> = {
  accountType: { subtitle: 'Select account type', options: ACCOUNT_TYPE_OPTIONS, field: 'accountType' },
  transferType: { subtitle: 'Select transfer type', options: TRANSFER_TYPE_OPTIONS, field: 'transferType' },
  reference: { subtitle: 'Select recipient reference', options: REFERENCE_OPTIONS, field: 'reference' },
}

export function NewRecipientScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const { recipients, addRecipient } = useAccounts()
  const draft = useTransferDraft()
  const pending = draft.newRecipient
  const { step, picker } = readState(location.state)
  const [savedId, setSavedId] = useState<string | null>(null)

  const accountProblem = accountNumberProblem(
    { bankCode: pending.bankCode ?? '', accountNo: pending.accountNo },
    recipients,
    BANK_DIRECTORY,
  )
  const validation = useTouchedValidation({ accountNo: accountProblem !== null })

  // A shell "Coming soon." belongs to the step it was raised on (the AppShell
  // rule keys on the path, and every step shares this one). The STEP only, not
  // the picker: an unavailable choice raises it and returns to the form in the
  // same tap, and that notice is the answer to the tap.
  useEffect(() => {
    if (currentNotice() === 'coming-soon') dismissNotice()
  }, [step])

  // THE SAVE'S LANDING: back on the first step's entry, swap it for the amount
  // screen. If that entry is the app's first (a deep link to /transfer/new),
  // put the picker under it so Back from the amount screen stays in the app.
  useEffect(() => {
    if (savedId === null || step !== 'type') return
    const amount = `/transfer/send/${savedId}`
    if (location.key === 'default') {
      navigate('/transfer', { replace: true })
      navigate(amount)
    } else {
      navigate(amount, { replace: true })
    }
  }, [savedId, step, location.key, navigate])

  if (savedId !== null && step === 'type') return null

  // A step that needs the draft, without it (a reload drops the draft).
  if (step === 'details' && !pending.bankCode) {
    return <Navigate to={location.pathname} replace state={null} />
  }

  const push = (next: Step, nextPicker?: Picker) =>
    navigate(location.pathname, {
      state: { [STEP_KEY]: next, ...(nextPicker ? { [PICKER_KEY]: nextPicker } : {}) },
    })

  const back = () => {
    if (step === 'type' && location.key === 'default') navigate('/transfer', { replace: true })
    else navigate(-1)
  }

  const header = (
    <>
      <StatusBar mode="Light" time="9:41" />
      <HeaderDefault
        title="New Transfer"
        subtitle={picker ? PICKERS[picker].subtitle : SUBTITLE[step]}
        onBack={back}
      />
    </>
  )

  if (step === 'type') {
    return (
      <div className="mvp-new-recipient">
        {header}
        {/* `.mvp-column` on the wrapper, never on the <ul>: the list's own padding
            reset would collapse the gutter (the Gate 14 hazard — measured here). */}
        <div className="mvp-column">
          <ul className="mvp-new-recipient__rows" aria-label="Transfer type">
            {TRANSFER_TO_OPTIONS.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  className="mvp-new-recipient__row type-body-m"
                  onClick={() => (o.available ? push('bank') : raiseNotice('coming-soon'))}
                >
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  if (step === 'bank') {
    return (
      <div className="mvp-new-recipient">
        {header}
        <div className="mvp-new-recipient__banks mvp-column">
          {bankGroups(BANKS).map((group) => (
            <section key={group.letter} className="mvp-new-recipient__group" aria-labelledby={`bank-letter-${group.letter}`}>
              <h2 id={`bank-letter-${group.letter}`} className="mvp-new-recipient__letter type-header-h6">
                {group.letter}
              </h2>
              <ul className="mvp-new-recipient__rows">
                {group.banks.map((b) => (
                  <li key={b.code}>
                    <button
                      type="button"
                      className="mvp-new-recipient__row type-body-m"
                      onClick={() => {
                        draft.setNewRecipient({ bankCode: b.code })
                        push('details')
                      }}
                    >
                      {b.name}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    )
  }

  if (picker) {
    const { options, field } = PICKERS[picker]
    return (
      <div className="mvp-new-recipient">
        {header}
        <div className="mvp-new-recipient__picker">
          <OptionList
            selectionMode="single"
            ariaLabel={PICKERS[picker].subtitle}
            options={options.map(({ id, label }) => ({ id, label }))}
            value={[pending[field] as string]}
            onChange={(value) => {
              const id = value[0]
              const option = options.find((o) => o.id === id)
              if (!option) return
              if (option.available) draft.setNewRecipient({ [field]: option.id })
              else raiseNotice('coming-soon')
            }}
            onDismiss={() => navigate(-1)}
          />
        </div>
      </div>
    )
  }

  const bank = BANKS.find((b) => b.code === pending.bankCode)!
  const isAccountShown = validation.isShown('accountNo')

  const next = () => {
    if (!validation.attempt()) return
    const account = lookupAccount(BANK_DIRECTORY, bank.code, pending.accountNo)!
    const recipient = buildRecipient({ account, now: new Date() })
    addRecipient(recipient)
    draft.clearNewRecipient()
    setSavedId(recipient.id)
    navigate(-2)
  }

  return (
    <div className="mvp-new-recipient">
      {header}
      <div ref={validation.formRef} className="mvp-new-recipient__form mvp-column" onBlur={validation.onBlur}>
        <div className="mvp-new-recipient__select" data-select="transferTo">
          <Select
            label="Transfer to"
            ariaLabel="Transfer to"
            sizing="fill"
            searchable={false}
            value={optionLabel(TRANSFER_TO_OPTIONS, 'account-number')}
            isOpen={false}
            onOpenChange={(open) => open && navigate(-2)}
          />
        </div>
        <div className="mvp-new-recipient__select" data-select="bank">
          <Select
            label="Recipient Bank"
            ariaLabel="Recipient bank"
            sizing="fill"
            searchable={false}
            value={bank.name}
            isOpen={false}
            onOpenChange={(open) => open && navigate(-1)}
          />
        </div>
        <div className="mvp-new-recipient__select" data-select="accountType">
          <Select
            label="Account Type"
            ariaLabel="Account type"
            sizing="fill"
            searchable={false}
            value={optionLabel(ACCOUNT_TYPE_OPTIONS, pending.accountType)}
            isOpen={false}
            onOpenChange={(open) => open && push('details', 'accountType')}
          />
        </div>
        <Field
          label="Account Number"
          name="accountNo"
          sizing="fill"
          value={pending.accountNo}
          onChange={(raw) => draft.setNewRecipient({ accountNo: accountNumberInput(raw) })}
          inputMode="numeric"
          maxLength={19}
          autoComplete="off"
          isInvalid={isAccountShown}
          error={isAccountShown ? accountProblem : undefined}
        />
        <div className="mvp-new-recipient__select" data-select="transferType">
          <Select
            label="Transfer Type"
            ariaLabel="Transfer type"
            sizing="fill"
            searchable={false}
            value={optionLabel(TRANSFER_TYPE_OPTIONS, pending.transferType)}
            isOpen={false}
            onOpenChange={(open) => open && push('details', 'transferType')}
          />
        </div>
        <div className="mvp-new-recipient__select" data-select="reference">
          <Select
            label="Recipient Reference"
            ariaLabel="Recipient reference"
            sizing="fill"
            searchable={false}
            value={optionLabel(REFERENCE_OPTIONS, pending.reference)}
            isOpen={false}
            onOpenChange={(open) => open && push('details', 'reference')}
          />
        </div>
        <Field
          label="Other Payment Details (Optional)"
          name="otherDetails"
          sizing="fill"
          value={pending.otherDetails}
          onChange={(value) => draft.setNewRecipient({ otherDetails: value.slice(0, OTHER_DETAILS_MAX) })}
          maxLength={OTHER_DETAILS_MAX}
          autoComplete="off"
        />
      </div>
      <div className="mvp-new-recipient__actions">
        <Button variant="primary" size="l" label="Next" onClick={next} />
      </div>
    </div>
  )
}

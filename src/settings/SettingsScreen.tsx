import {
  Button,
  HeaderDefault,
  Icon,
  Modal,
  StatusBar,
  Toggle,
} from '@monarch/design-system'
import { useState, useSyncExternalStore } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { SectionHeader } from '../components/SectionHeader'
import { FIAT_ACCOUNTS } from '../data/accounts'
import { formatMyr } from '../data/format'
import { resetToSeed, storeMode, subscribeStoreMode, type StoreMode } from '../persistence/store'
import { raiseNotice } from '../shell/notices'
import { useTheme } from '../theme/ThemeProvider'
import './settings.css'

/**
 * ─────────────────────────── SETTINGS — Gate 87 ───────────────────────────
 *
 * Opened by tapping Margaret's photo in the header (`HeaderBg`'s v2.9.0
 * `onAvatarClick`, on `/` and `/finance`). Teku asked for "a page or screen"
 * holding Reset data and the dark-mode control (12 Oct 2026); nothing else is
 * here by ruling R87-2 — no profile editing, no placeholder rows.
 *
 * UNDESIGNED WORK. No Figma frame draws a settings screen, a reset
 * confirmation or a storage notice (Gate 87 Phase A searched all seven pages).
 * The row shape — a bordered card with a label line and a trailing control — is
 * Onboarding_09's (`1266:14353`, the "Voice Assitance" card `I1266:14353;892:8550`),
 * the nearest thing the file draws.
 *
 * Chrome is a pushed screen's (`chrome.ts`): no nav, no FAB, a back control.
 * Back goes back through history, so it returns to whichever of the two screens
 * opened it — on the tab it was on, because the entry screen stored that tab in
 * its own history entry before pushing. Opened directly (a deep link or a
 * reload of `/settings`), there is no history to go back to, so it goes Home.
 *
 * Focus is not moved on arrival or return, the same as every drill-down.
 */

/** The seed's balances, named in the confirmation — derived, never typed. */
const SEED_BALANCES = FIAT_ACCOUNTS.map((a) => `${a.name} ${formatMyr(a.balance)}`).join(' and ')

const RESET_BODY =
  "This puts back the original demo data. Everything you've added or changed is removed: " +
  'transactions, receipts and their photos, budgets, and goals and their photos. ' +
  `Account balances go back to ${SEED_BALANCES}. ` +
  "Your appearance setting stays as it is. This can't be undone."

/** Why Reset is unavailable, by store mode. `null` means it is available. */
function resetUnavailableReason(mode: StoreMode): string | null {
  switch (mode) {
    case 'persist':
      return null
    case 'readonly':
      return "This tab is out of date, so it can't reset. Reopen the app to reset."
    case 'memory':
      return "This device isn't saving changes, so there's nothing to reset."
  }
}

export function SettingsScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { preference, setPreference } = useTheme()
  const mode = useSyncExternalStore(subscribeStoreMode, storeMode)
  const [isConfirming, setIsConfirming] = useState(false)

  const unavailable = resetUnavailableReason(mode)

  const back = () => {
    if (location.key === 'default') navigate('/', { replace: true })
    else navigate(-1)
  }

  const confirmReset = async () => {
    setIsConfirming(false)
    await resetToSeed()
    // A reset whose write failed has already raised "not being saved"; only a
    // reset that committed says it is done.
    if (storeMode() === 'persist') raiseNotice('reset-done')
  }

  return (
    <div className="mvp-settings">
      <StatusBar mode="Light" time="9:41" />
      {/* `hasSubtitle={false}` IS LOAD-BEARING: `HeaderDefault` defaults it to
          true with the literal "Subtitle" (the omitted-prop trap). */}
      <HeaderDefault title="Settings" hasSubtitle={false} onBack={back} />

      <div className="mvp-settings__body mvp-column">
        <section className="mvp-settings__section">
          <SectionHeader label="Appearance" />
          <div className="mvp-settings__card">
            <div className="mvp-settings__row">
              <span className="mvp-settings__row-label type-body-m">Dark mode</span>
              <Toggle
                isChecked={preference === 'dark'}
                onChange={(on) => setPreference(on ? 'dark' : 'light')}
                ariaLabel="Dark mode"
              />
            </div>
          </div>
        </section>

        <section className="mvp-settings__section">
          <SectionHeader label="Your data" />
          <div className="mvp-settings__card">
            <span className="mvp-settings__row-label type-body-m-semibold">Reset demo data</span>
            <p className="mvp-settings__row-body type-body-sm">
              Put back the original demo accounts, transactions, receipts, budgets and goals.
            </p>
            <div className="mvp-settings__action">
              <Button
                variant="tertiary"
                tone="error"
                size="m"
                label="Reset data"
                leadingIcon={<Icon name="refresh" size="m" />}
                isDisabled={unavailable !== null}
                onClick={() => setIsConfirming(true)}
              />
            </div>
            {unavailable !== null && (
              <p className="mvp-settings__reason type-body-caption">{unavailable}</p>
            )}
          </div>
        </section>
      </div>

      {isConfirming && (
        <Modal
          isOpen
          onClose={() => setIsConfirming(false)}
          title="Reset demo data?"
          footer={
            <>
              <Button
                variant="secondary"
                size="l"
                label="Cancel"
                onClick={() => setIsConfirming(false)}
              />
              <Button
                variant="tertiary"
                tone="error"
                size="l"
                label="Reset"
                leadingIcon={<Icon name="refresh" size="l" />}
                onClick={() => void confirmReset()}
              />
            </>
          }
        >
          <p className="mvp-settings__confirm-body type-body-sm">{RESET_BODY}</p>
        </Modal>
      )}
    </div>
  )
}

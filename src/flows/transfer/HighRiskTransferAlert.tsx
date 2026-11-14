import { Avatar, Banner, Button, Divider, Icon, IconObject, Link, Modal } from '@monarch/design-system'
import { illustrationUrl } from '../../config/media'
import { recipientAccountLine } from '../../data/derive'
import type { TransferRisk } from '../../data/transferRisk'
import type { Recipient } from '../../data/types'
import { riskDetailLines, riskHeadline } from './riskCopy'
import './transfer.css'

/** Which of the three alert views is open — each one a history entry (R103-3). */
export type RiskAlertView = 'warning' | 'education' | 'confirm'

export interface HighRiskTransferAlertProps {
  view: RiskAlertView
  risk: TransferRisk
  recipient: Recipient
  /** Cancel Transfer / ✕ / scrim / Escape on any view, and Got it: one step back. */
  onClose: () => void
  /** "How does Monarch detect this?": pushes the education view. */
  onLearn: () => void
  /** Proceed Anyway on the warning: replaces it with the second confirm. */
  onProceed: () => void
  /** Proceed Anyway on the second confirm: replaces it with Flow 4's review sheet. */
  onProceedConfirmed: () => void
}

/** What Monarch checks, and what it does not (`1266:14383`; Decision 36 copy). */
const CHECKS = [
  'Account age (newly opened accounts)',
  'Transaction history (very low activity)',
  'Unusual payment size for you',
]
const NEVERS = [
  'Move or block money automatically',
  'Share your data with third parties',
  'Make decisions without your approval',
]

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE HIGH-RISK TRANSFER ALERT — Gate 103 (Flow 6 part 2). Figma `1266:14382`
 * (HighRisk01, the warning), `1266:14383` (the education overlay) and
 * `1266:14384` (HighRisk02, the second confirm). Decisions 35–39; R100-6 … R100-9;
 * R103-1 … R103-11.
 *
 * ONE DIALOG AT A TIME (R103-4): each view is its OWN `Modal`, rendered by view,
 * so a view change unmounts one dialog and mounts the next in a single commit.
 * The DS `Modal` then does the focus work itself: the outgoing modal's cleanup
 * hands focus back to what was focused before it opened ("Transfer money"), the
 * incoming one records that and moves focus to its first focusable, the ✕
 * (Gate 80 precedent). Closing from any view therefore lands on "Transfer
 * money" with no app code.
 *
 * TITLE-LESS MODALS, NAMED BY `ariaLabel` (R103-5): Figma draws only the ✕ in
 * each header and the words in the body.
 *
 * THE GEOMETRY IS A MODAL, NOT A SHEET: every card is 343 wide at x=16 with all
 * four corners rounded — Figma's inner node is named "Bottom Sheet", the trap
 * this project has met five times.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function HighRiskTransferAlert(props: HighRiskTransferAlertProps) {
  if (props.view === 'warning') return <WarningView {...props} />
  if (props.view === 'education') return <EducationView onClose={props.onClose} />
  return <ConfirmView {...props} />
}

function Choices({ onCancel, onProceed }: { onCancel: () => void; onProceed: () => void }) {
  return (
    <>
      <Button variant="primary" size="l" label="Cancel Transfer" onClick={onCancel} />
      <Button variant="secondary" size="l" label="Proceed Anyway" onClick={onProceed} />
    </>
  )
}

/** The 56px warning triangle, `icon/error/default` (Decision 39 = D: DS v2.15.0 `xxxl`). */
function WarningGlyph() {
  return (
    <span className="mvp-risk__glyph">
      <Icon name="warning" size="xxxl" />
    </span>
  )
}

function WarningView({ risk, onClose, onLearn, onProceed }: HighRiskTransferAlertProps) {
  return (
    <Modal
      isOpen
      onClose={onClose}
      ariaLabel="High-Risk Transfer"
      className="mvp-risk-modal"
      footer={<Choices onCancel={onClose} onProceed={onProceed} />}
    >
      <div className="mvp-risk">
        <div className="mvp-risk__lead">
          <WarningGlyph />
          {/* R100-9 / R102-8; no `role="alert"` (R103-6): the dialog's opening announces it. */}
          <Banner tone="error" title="Warning" description="High-Risk Transfer" />
          <p className="mvp-risk__headline type-body-m-semibold">{riskHeadline(risk.reasons)}</p>
        </div>
        <div className="mvp-risk__more">
          {/* R103-9: no fill — Figma's `surface/primary/default-subtle` is white
              and would not follow dark mode. */}
          <div className="mvp-risk__details">
            <p className="mvp-risk__details-label type-body-caption">Details</p>
            <ul className="mvp-risk__lines">
              {riskDetailLines(risk).map((line) => (
                <li key={line} className="type-body-m">
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <p className="mvp-risk__learn">
            {/* R103-8: both icons and the new-tab target passed, not omitted (the
                omitted-prop trap twice); 12 / 600 on DS v2.15.0. */}
            <Link
              size="m"
              weight="semibold"
              label="How does Monarch detect this?"
              iconBefore={null}
              iconAfter={null}
              target="_self"
              onClick={(event) => {
                event.preventDefault()
                onLearn()
              }}
            />
          </p>
        </div>
      </div>
    </Modal>
  )
}

function EducationView({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      isOpen
      onClose={onClose}
      ariaLabel="Smart Fraud Protection"
      className="mvp-risk-modal mvp-risk-education-modal"
      footer={<Button variant="primary" size="l" label="Got it" onClick={onClose} />}
    >
      <div className="mvp-risk-education">
        <div className="mvp-risk-education__hero">
          {/* Decision 37: Teku's export, decorative. R103-13 sizes it so the
              visible shield matches Figma's framing in the 81 x 80 slot. */}
          <span className="mvp-risk-education__shield-slot">
            <img className="mvp-risk-education__shield" src={illustrationUrl('shield.png')} alt="" />
          </span>
          <div className="mvp-risk-education__titles">
            <p className="mvp-risk-education__title type-header-h6">Smart Fraud Protection</p>
            <p className="mvp-risk-education__subtitle type-body-sm">How Monarch flags unusual transfers</p>
          </div>
        </div>

        <Divider />

        <div className="mvp-risk-education__why">
          <p className="type-body-m-medium">Why you're seeing this alert</p>
          <p className="type-body-sm">
            This transfer looks unusual based on patterns linked to common scams, especially with new or inactive
            accounts.
          </p>
        </div>

        <div className="mvp-risk-education__card">
          <div className="mvp-risk-education__group">
            <p className="mvp-risk-education__checks-label type-body-caption">What Monarch Checks</p>
            <ul className="mvp-risk-education__list">
              {CHECKS.map((item) => (
                <li key={item} className="mvp-risk-education__item">
                  <IconObject color="blue" size="xs" shape="square">
                    <Icon name="check" size="xs" />
                  </IconObject>
                  <span className="type-body-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <Divider />
          <div className="mvp-risk-education__group">
            <p className="type-body-caption-medium">What Monarch does NOT do</p>
            <ul className="mvp-risk-education__list">
              {NEVERS.map((item) => (
                <li key={item} className="mvp-risk-education__item">
                  <IconObject color="red" size="xs" shape="square">
                    <Icon name="close" size="xs" />
                  </IconObject>
                  <span className="type-body-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mvp-risk-education__caption type-body-caption">
          Monarch alerts you, but you decide what happens
        </p>
        {/* R103-7: the National Scam Response Centre, after the caption. */}
        <p className="mvp-risk-education__nsrc type-body-sm">
          If someone is telling you to ignore this warning, cancel the transfer and call the National Scam Response
          Centre on 997.
        </p>
      </div>
    </Modal>
  )
}

function ConfirmView({ recipient, onClose, onProceedConfirmed }: HighRiskTransferAlertProps) {
  return (
    <Modal
      isOpen
      onClose={onClose}
      ariaLabel="Proceed with high-risk transfer"
      className="mvp-risk-modal"
      footer={<Choices onCancel={onClose} onProceed={onProceedConfirmed} />}
    >
      <div className="mvp-risk">
        <div className="mvp-risk__lead">
          <WarningGlyph />
          <p className="mvp-risk__question type-body-m-semibold">
            You are choosing to proceed with a{' '}
            <span className="mvp-risk__error-text">flagged high-risk transfer.</span> Do you still want to continue?
          </p>
        </div>
        <div className="mvp-risk__party">
          {/* A flagged recipient is always one the user added, and `buildRecipient`
              gives every one the placeholder mark (Gate 101), so the silhouette is
              drawn directly at 56 (`Avatar xl`, DS v2.15.0; `TransactionMark` stops at `l`). */}
          <Avatar size="xl" />
          <div className="mvp-risk__party-text">
            <p className="mvp-risk__error-text type-body-m-semibold">{recipient.name}</p>
            <p className="mvp-risk__party-line type-body-sm">{recipientAccountLine(recipient)}</p>
          </div>
        </div>
      </div>
    </Modal>
  )
}

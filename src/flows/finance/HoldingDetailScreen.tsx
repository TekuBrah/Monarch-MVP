import { useState } from 'react'
import {
  Button,
  CardDataDisplay,
  HeaderDefault,
  Icon,
  IconObject,
  ListItem,
  Logo,
  StatusBar,
  ToastMobile,
} from '@monarch/design-system'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAccounts } from '../../accounts/AccountsProvider'
import { SectionHeader } from '../../components/SectionHeader'
import { holdingValue } from '../../data/derive'
import { DetailRows } from './components/DetailRows'
import { HoldingHero } from './components/HoldingHero'
import { ReminderModal, StatementModal } from './components/PresetModals'
import { holdingFields } from './holdingFields'
import './finance.css'

/**
 * `Finance_Overview02` — ONE drill-down screen for all nine holdings.
 *
 * B4. Figma draws this screen once, for the fixed deposit. Building it as nine
 * screens — or as one screen with nine `if` branches inline — is how the copies
 * drift apart, so the content comes from `holdingFields()`, an exhaustive switch
 * over the `Holding` union. Adding a tenth holding type fails the build in that
 * file instead of rendering a blank screen here.
 *
 * BOTH DETAIL-ROW IDIOMS ARE PRESENT because the source draws both: a
 * `CardDataDisplay` tile group and a plain label/value group. See `DetailRows`
 * for why the second is a composition rather than a `ListItem`.
 *
 * B8 — NO ROUTE-SCOPED PROVIDER. The selected holding is a route param and the
 * data comes from `useAccounts()`, the same app-level provider every other
 * screen reads. A provider mounted per drill-down would make the holding's
 * identity live in two places at once.
 *
 * SYS-5 IS A FLEX ARTIFACT, NOT A LITERAL TO CHASE. Figma's four data-display
 * tiles compute to 165.5px wide; they are authored as `flex: 1 0 0` with
 * `min-width: 128px` in a wrapping row with a 12px gap. Implementing that with
 * flex reproduces the measurement and rounds naturally, so there is no
 * fractional value anywhere in `finance.css`.
 */
export function HoldingDetailScreen() {
  const navigate = useNavigate()
  const { holdingId } = useParams()
  const { holdings, cryptoHoldings, transactions } = useAccounts()

  const [openModal, setOpenModal] = useState<'reminder' | 'statement' | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const holding = holdings.find((h) => h.id === holdingId)
  // An unknown id is a bad URL, not an error state worth designing. Send it home.
  if (!holding) return <Navigate to="/finance" replace />

  const fields = holdingFields(holding, cryptoHoldings, transactions)
  const value = holdingValue(holding, cryptoHoldings)

  return (
    <div className="mvp-finance-detail">
      {/*
        `HeaderBg` carries its own status bar; `HeaderDefault` does not, so this
        screen supplies one. That asymmetry is the DS's, and matching it is what
        keeps the two screens the same height at the top.
      */}
      <StatusBar mode="Light" time="9:41" />
      <HeaderDefault
        title={holding.name}
        subtitle={holding.category}
        hasSubtitle
        onBack={() => navigate('/finance')}
      />

      <div className="mvp-finance-detail__body">
        <HoldingHero
          name={holding.name}
          icon={holding.icon}
          badgeColor={holding.badgeColor}
          value={value}
          trend={fields.hero.trend}
          footnote={fields.hero.footnote}
        />

        {/* Idiom one — the wrapping tile row. `content2` is left off on all of
            them, exactly as Figma's four instances do. */}
        <section className="mvp-finance-detail__section">
          <div className="mvp-finance-detail__tiles">
            {fields.tiles.map((tile) => (
              <CardDataDisplay key={tile.info} info={tile.info} content={tile.content} />
            ))}
          </div>
        </section>

        {/* Idiom two — the label/value rows. Rendered only where the type has
            any: `rows` and `list` are alternatives, not a pair. */}
        {fields.rows.length > 0 && (
          <section className="mvp-finance-detail__section">
            <DetailRows rows={fields.rows} />
          </section>
        )}

        {fields.list && fields.list.entries.length > 0 && (
          <section className="mvp-finance-detail__section mvp-finance-detail__list-section">
            {/*
              GATE 6. This was a bare `<Label label={…} size="s" />`, which is
              the one section heading in the app that escaped the component and
              therefore rendered without `mn-label--subtle` — text/default/default
              where the ruling says every section header binds text/subtle/default.

              The fix is the shared component, not a `tone` prop here: the whole
              point is that the rule is not a per-call-site decision. No
              `linkLabel` — this heading has no "see all" affordance, and
              `SectionHeader` already renders correctly without one (HomepageFiat's
              "Monarch Academy" call site is the proof).
            */}
            <SectionHeader label={fields.list.label} />
            <ul className="mvp-finance-detail__list">
              {fields.list.entries.map((entry) => (
                <li key={entry.id}>
                  <ListItem
                    type={entry.trend ? 'crypto' : 'default'}
                    leading={
                      entry.logo ? (
                        <Logo name={entry.logo} size="m" />
                      ) : (
                        <IconObject color={holding.badgeColor} shape="circle" size="l">
                          <Icon name={entry.icon ?? 'icon_stocks'} size="m" />
                        </IconObject>
                      )
                    }
                    title={entry.title}
                    titleInfo={entry.titleInfo}
                    amount={entry.amount}
                    amountInfo={entry.amountInfo}
                    trendDirection={entry.trend}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {(fields.actions.reminder || fields.actions.statement) && (
        /*
          The bottom action bar. Its scrim is `--mapped-gradient-default`, which
          is the SAME token Figma names on this frame (`Gradient/default`) — and
          as of DS v1.2.0 it derives from `--mapped-surface-page`, so it fades to
          the page colour in both themes instead of always fading to white.
        */
        <div className="mvp-finance-detail__actions">
          {fields.actions.reminder && (
            <Button
              variant="primary"
              size="m"
              label="Set Maturity Reminder"
              onClick={() => setOpenModal('reminder')}
            />
          )}
          {fields.actions.statement && (
            <Button
              variant="secondary"
              size="m"
              label="Download Statement"
              onClick={() => setOpenModal('statement')}
            />
          )}
        </div>
      )}

      <ReminderModal
        isOpen={openModal === 'reminder'}
        onClose={() => setOpenModal(null)}
        onConfirm={(label) => setToast(`Reminder set for ${label.toLowerCase()} maturity.`)}
      />
      <StatementModal
        isOpen={openModal === 'statement'}
        onClose={() => setOpenModal(null)}
        onConfirm={(label) => setToast(`Statement for ${label.toLowerCase()} sent to your email.`)}
      />

      {toast && (
        <div className="mvp-finance-detail__toast">
          <ToastMobile
            appearance="success"
            title={toast}
            role="status"
            onDismiss={() => setToast(null)}
          />
        </div>
      )}
    </div>
  )
}

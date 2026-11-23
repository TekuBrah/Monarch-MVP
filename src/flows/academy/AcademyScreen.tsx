import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Button,
  CardFeaturesAndEducation,
  CardSmartInsightsRow,
  ChartLegendItem,
  Field,
  HeaderDefault,
  Icon,
  ProgressBar,
  ProgressIcon,
  StatusBar,
  Tabs,
  ToggleChip,
} from '@monarch/design-system'
import type { TabItem } from '@monarch/design-system'
import { useAccounts } from '../../accounts/AccountsProvider'
import { useBudgets } from '../../budgets/BudgetsProvider'
import { NoResults } from '../../components/NoResults'
import { SectionHeader } from '../../components/SectionHeader'
import { illustrationUrl } from '../../config/media'
import {
  ACADEMY_CHIPS,
  ACADEMY_COURSES,
  ACADEMY_FIRST_NAME,
  ACADEMY_START_TILES,
  ACADEMY_TILE_GROUPS,
  ESSENTIALS_COMPLETE,
  ESSENTIAL_TASKS,
  type AcademyChipId,
  type AcademyDestination,
} from '../../data/academy'
import {
  essentialTasks,
  filterAcademyCategory,
  filterAcademyTileGroups,
  masteryLevel,
  thousandsOfRinggit,
} from '../../data/derive'
import { raiseNotice } from '../../shell/notices'
import { destinationTarget } from './academyTabs'
import './academy.css'

/**
 * Flow 2 — Monarch Academy (Gate 109). Figma `1266:14274` (App Guide) and
 * `1266:14275` (Wealth Wisdom), built under Decisions 41–55.
 *
 * ONE ROUTE, TWO TAB STATES — the Flow 1 / B7 shape: App Guide and Wealth Wisdom
 * are selected-states of one screen, so the tab is `useState` and never reaches
 * the URL. The literal default stays in the initialiser because the harness
 * identifies the default tab by parsing it (`parseTabbedScreen`).
 *
 * NO TAB HANDOVER (R109-7). Home hands its tab over before it pushes a screen
 * (Gate 87) because Back must land on the tab the user left. The Academy does
 * not: only App Guide has destinations (every Wealth Wisdom control says
 * "Coming soon."), so Back always lands on the default tab, which is the only
 * tab a destination can be reached from. The first Wealth Wisdom control that
 * navigates brings the handover back with it, in the Gate 87 shape.
 *
 * NOTHING HERE IS STORED (R107-4). Every figure is derived from data the app
 * already keeps; every drawn control with no destination raises "Coming soon."
 * (Decision 41). Search and the chips are in-screen state only (R107-2, R107-3).
 */

const TABS: TabItem[] = [
  { id: 'app-guide', label: 'App Guide' },
  { id: 'wealth-wisdom', label: 'Wealth Wisdom' },
]

export function AcademyScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string>('app-guide')

  // Opened directly (a deep link or a reload with no history), Back replaces
  // itself with Home rather than leaving the app — the Settings mechanism.
  const back = () => {
    if (location.key === 'default') navigate('/', { replace: true })
    else navigate(-1)
  }

  // A destination, or "Coming soon." when there is none (Decisions 41, 42). The
  // Academy's own entry is left as it is: Back lands on the default tab (R109-7).
  const go = (destination: AcademyDestination | null) => {
    if (destination === null) {
      raiseNotice('coming-soon')
      return
    }
    const target = destinationTarget(destination)
    navigate(target.path, { state: target.state })
  }

  return (
    <div className="mvp-academy">
      <StatusBar mode="Light" time="9:41" />
      <HeaderDefault title="Monarch Academy" hasSubtitle={false} onBack={back} />

      <div className="mvp-academy__tabs">
        <Tabs tabs={TABS} selectedId={selected} onChange={setSelected} ariaLabel="Academy sections" />
      </div>

      {selected === 'app-guide' && <AppGuide go={go} />}
      {selected === 'wealth-wisdom' && <WealthWisdom />}
    </div>
  )
}

/* ── The level card (Decision 45) ─────────────────────────────────────────── */

function LevelCard({
  tone,
  title,
  value,
  barLabel,
  badge,
  line,
}: {
  tone: 'guide' | 'wisdom'
  title: string
  value: number
  barLabel: string
  badge?: string
  line: string
}) {
  return (
    <div className={`mvp-academy-level mvp-academy-level--${tone}`}>
      {/* The watermark, Figma `logo_monarch_L` as Figma serves it (decorative). */}
      <img className="mvp-academy-level__mark" src={illustrationUrl('academy-mark.svg')} alt="" />
      <p className="type-body-m-semibold mvp-academy-level__title">{title}</p>
      <div className="mvp-academy-level__row">
        {/* Decision 54 = B: the DS fill option, green-600 light / green-400 dark. */}
        <ProgressBar
          value={value}
          variant="green"
          showLabels={false}
          ariaLabel={barLabel}
          className="mvp-academy-level__bar"
        />
        {badge && <span className="type-body-m-semibold mvp-academy-level__badge">{badge}</span>}
      </div>
      <p className="type-body-sm-medium mvp-academy-level__line">{line}</p>
    </div>
  )
}

/* ── App Guide (`1266:14274`) ─────────────────────────────────────────────── */

function AppGuide({ go }: { go: (destination: AcademyDestination | null) => void }) {
  const { transactions, userRecipients, goals, receipts, categoryRules } = useAccounts()
  const { budgets } = useBudgets()
  const [search, setSearch] = useState('')

  const progress = essentialTasks({ transactions, userRecipients, budgets, goals, receipts, categoryRules })
  const level = masteryLevel(progress.done)
  const total = ESSENTIAL_TASKS.length
  const groups = filterAcademyTileGroups(ACADEMY_TILE_GROUPS, search)
  const next = progress.next

  return (
    <div className="mvp-academy__body mvp-column">
      <LevelCard
        tone="guide"
        title="Your Monarch mastery"
        value={(progress.done / total) * 100}
        barLabel={`Monarch mastery, ${progress.done} of ${total} essential tasks`}
        badge={`Lv${level.level}`}
        line={`Level ${level.level}: ${level.name}`}
      />

      <section className="mvp-academy__section">
        <SectionHeader label="Essential Tasks" />
        {/* The ring is decorative (R108-6): the caption already states the count. */}
        {next ? (
          <CardSmartInsightsRow
            leading={<ProgressIcon icon={<Icon name="savings" size="l" />} value={progress.done} max={total} />}
            title={next.title}
            caption={`${progress.done} of ${total} completed`}
            linkLabel="Set up now"
            onLinkClick={() => go(next.destination)}
          />
        ) : (
          <CardSmartInsightsRow
            leading={<ProgressIcon icon={<Icon name="savings" size="l" />} value={progress.done} max={total} />}
            title={ESSENTIALS_COMPLETE}
            caption={`${progress.done} of ${total} completed`}
          />
        )}
      </section>

      <section className="mvp-academy__section">
        <SectionHeader label="New Feature Spotlight" />
        <div className="mvp-academy-spotlight">
          {/* Decision 48: a screenshot of Monarch's own Budget tab, no device
              frame. Decorative: the line below says what it shows. */}
          <img
            className="mvp-academy-spotlight__image"
            src={illustrationUrl('spotlight-budgets.png')}
            alt=""
          />
          <div className="mvp-academy-spotlight__footer">
            <p className="type-body-sm-semibold mvp-academy-spotlight__title">Introducing budgets</p>
            {/* R108-8: Inverse is the dark context; the flex column stretches the
                button to the card's width. */}
            <div className="mvp-academy-spotlight__action" data-theme="dark">
              <Button variant="primary" size="s" label="See budgets" onClick={() => go('finance-budget')} />
            </div>
          </div>
        </div>
      </section>

      <section className="mvp-academy__section">
        <SectionHeader label="Explore features" />
        <Field
          value={search}
          onChange={setSearch}
          placeholder="Search features"
          ariaLabel="Search features"
          sizing="fill"
          leadingIcon={<Icon name="search" size="m" />}
        />
      </section>

      {groups.length === 0 ? (
        <NoResults
          icon="search"
          title="No features match"
          description="Try a feature name, like Budgets or Transfers."
          actionLabel="Clear search"
          onReset={() => setSearch('')}
        />
      ) : (
        groups.map((group) => (
          <section key={group.id} className="mvp-academy__section">
            <SectionHeader label={group.label} />
            <div className="mvp-academy__tiles">
              {group.tiles.map((tile) => (
                <CardFeaturesAndEducation
                  key={tile.id}
                  sizing="fill"
                  variant={group.variant}
                  title={tile.label}
                  icon={<Icon name={tile.icon} size="xxl" />}
                  onClick={() => go(tile.destination)}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}

/* ── Wealth Wisdom (`1266:14275`) ─────────────────────────────────────────── */

function WealthWisdom() {
  const { primaryAccount } = useAccounts()
  const [chip, setChip] = useState<AcademyChipId>('all')
  const comingSoon = () => raiseNotice('coming-soon')

  const startTiles = filterAcademyCategory(ACADEMY_START_TILES, chip)
  const courses = filterAcademyCategory(ACADEMY_COURSES, chip)
  // The nudge reads the user's balance, not a topic, so it shows under All only.
  const showNudge = chip === 'all'
  const chipLabel = ACADEMY_CHIPS.find((c) => c.id === chip)!.label

  return (
    <div className="mvp-academy__body">
      <div className="mvp-column">
        {/* Decision 45: nothing measures learning yet, so no score and no badge. */}
        <LevelCard
          tone="wisdom"
          title="Your learning"
          value={0}
          barLabel="Lessons completed, none yet"
          line="Lessons are coming soon."
        />
      </div>

      {/* R107-2: scrolls sideways as drawn; the gutter rides as padding. */}
      <div className="mvp-academy__chips mvp-column--bleed" role="group" aria-label="Topics">
        {ACADEMY_CHIPS.map((c) => (
          <ToggleChip key={c.id} label={c.label} isSelected={c.id === chip} onClick={() => setChip(c.id)} />
        ))}
      </div>

      {showNudge && (
        <div className="mvp-column">
          {/* Decision 44 = B: an education line built from the real balance; the
              bare glyph in the green row (Decision 51). */}
          <CardSmartInsightsRow
            variant="green"
            leading={<Icon name="insights" size="xl" />}
            title={`You have RM ${thousandsOfRinggit(primaryAccount.balance).toLocaleString('en-MY')}K in ${primaryAccount.name}`}
            caption="Learn how savings interest works (4 min)"
            onClick={comingSoon}
          />
        </div>
      )}

      {startTiles.length > 0 && (
        <section className="mvp-academy__section mvp-column">
          <SectionHeader label={`Start here, ${ACADEMY_FIRST_NAME}`} />
          <div className="mvp-academy__tiles">
            {startTiles.map((tile) => (
              <CardFeaturesAndEducation
                key={tile.id}
                sizing="fill"
                variant="outline"
                kicker={tile.kicker}
                accent={tile.accent}
                title={tile.title}
                icon={<Icon name={tile.icon} size="xxl" />}
                onClick={comingSoon}
              />
            ))}
          </div>
        </section>
      )}

      {courses.length > 0 && (
        <section className="mvp-academy__section mvp-column">
          <SectionHeader label="Short courses" />
          <ul className="mvp-academy__courses">
            {courses.map((course) => (
              <li key={course.id}>
                <ChartLegendItem
                  variant="legend"
                  icon={<Icon name={course.icon} size="xl" />}
                  iconColor={course.iconColor}
                  title={course.title}
                  subtitle={course.meta}
                  amount=""
                  hasChevron={false}
                  onClick={comingSoon}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {startTiles.length === 0 && courses.length === 0 && (
        <p className="type-body-sm mvp-academy__empty mvp-column">Nothing on {chipLabel} yet.</p>
      )}
    </div>
  )
}

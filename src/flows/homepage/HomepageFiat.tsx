import {
  CardFeaturesAndEducation,
  CardSmartInsights,
  Icon,
  Link,
  ListItem,
  Logo,
} from '@monarch/design-system'
import { useNavigate } from 'react-router-dom'
import { useAccounts } from '../../accounts/AccountsProvider'
import { mediaUrl } from '../../config/media'
import { recentTransactions } from '../../data/derive'
import { formatSignedMyr, formatTimestamp } from '../../data/format'
import { ACADEMY_PROMO, FEATURE_CARDS, SMART_INSIGHTS } from '../../data/insights'
import { SectionHeader } from '../../components/SectionHeader'
import { BalanceCard } from './components/BalanceCard'

/**
 * `Homepage_Fiat` (`1266:14402`) — the Accounts tab's body.
 *
 * Header and Tabs are NOT here: they belong to `HomepageScreen`, because the
 * two tabs are two states of one screen rather than two screens (Flow 1 §3).
 * That also settles SYS-10 and SYS-11 structurally — there is one header and
 * one Tabs instance for the whole page, so neither can vary in height or width
 * between tabs the way Figma's copies do.
 *
 * Note F1 A2, recorded and left: the tab reads "Accounts" while the frame is
 * named `Homepage_Fiat`. Node IDs are authoritative; the file name is not.
 */
export function HomepageFiat() {
  const navigate = useNavigate()
  const { primaryAccount, transactions } = useAccounts()

  // A slice of the one ledger, newest first — not a second hand-authored list.
  const recent = recentTransactions(transactions, 2)

  return (
    <div className="mvp-home__body">
      <BalanceCard
        logo={primaryAccount.logo}
        group={primaryAccount.group}
        name={primaryAccount.name}
        amount={primaryAccount.balance}
        addLabel="Add money"
        onSend={() => navigate('/transfer')}
      />

      <section className="mvp-home__section mvp-column">
        {/* SYS-3 / A4: a Label, where Figma left a raw text node. */}
        <SectionHeader label="Transactions" linkLabel="See all" />
        <ul className="mvp-home__list">
          {recent.map((txn) => (
            <li key={txn.id}>
              <ListItem
                type="default"
                leading={<Logo name={txn.logo} size="m" />}
                title={txn.merchant}
                titleInfo={txn.method}
                amount={formatSignedMyr(txn.amount)}
                amountInfo={formatTimestamp(txn.occurredAt)}
                hasReceiptIcon={txn.hasReceipt}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="mvp-home__section">
        <div className="mvp-column">
          <SectionHeader
            label="Smart Insights"
            icon="icon_aiinsights"
            linkLabel="See all"
          />
        </div>
        {/*
          A12 / SYS-9, recorded and LEFT ALONE: the carousel genuinely overflows
          375px in Figma, and the disposition is "intentional horizontal
          scroll". So it scrolls here rather than wrapping or shrinking.

          KEYBOARD REACHABILITY — added by Flow 7, a Flow 1 defect rather than a
          Flow 7 need. This was a bare <div>, so it was not focusable and a
          keyboard user could not scroll it at all; the third card was reachable
          only with a pointer. `tabIndex={0}` plus a region role is what earns
          the browser's built-in arrow-key / Home / End scrolling, and it had to
          land in the same change as hiding the scrollbar — suppressing the
          indicator without this would have removed the last visible hint that
          there was anything to scroll.
        */}
        <div
          className="mvp-home__carousel"
          role="region"
          aria-label="Smart Insights"
          tabIndex={0}
        >
          {SMART_INSIGHTS.map((insight) => (
            <CardSmartInsights
              key={insight.id}
              title={insight.title}
              // A token NAME from the data becomes a var() here — never a value
              // in the data file (architecture §3.4).
              titleColor={insight.titleToken ? `var(--${insight.titleToken})` : undefined}
              description={insight.description}
              linkLabel={insight.linkLabel}
              icon={
                insight.icon ? (
                  <Icon name={insight.icon} size="m" />
                ) : (
                  <span className="mvp-home__logo-stack">
                    {insight.logos?.map((logo) => (
                      <Logo key={logo} name={logo} size="s" />
                    ))}
                    {insight.logoOverflow ? (
                      <span className="type-body-caption mvp-home__logo-overflow">
                        +{insight.logoOverflow}
                      </span>
                    ) : null}
                  </span>
                )
              }
            />
          ))}
        </div>
      </section>

      <section className="mvp-home__section">
        <div className="mvp-column">
          {/*
            A8, recorded and LEFT: Figma hides this section's "See all" link
            while every sibling section shows one, and the disposition is
            "FIX IN FIGMA — decide intent". Reproduced as hidden by omitting
            linkLabel, rather than quietly adding the link back.
          */}
          <SectionHeader label="Monarch Academy" icon="icon_monarchacademy" />
        </div>

        <div className="mvp-column mvp-home__promo-stack">
          {/*
            A6 FIXED. Figma's Section placement renders a literal `{title}`
            here; the main component it instances renders "Monarch Academy",
            which is what the data carries.
          */}
          <div className="mvp-home__promo">
            {/*
              The Academy illustration (Gate 3b). Figma's `❖ System message`
              band leads with it — `Group 284`, 94.08 x 65 at x=0 inside a
              327-wide content frame — with the text flowing to its right.

              It is a TRANSPARENT CUT-OUT, so `object-fit: contain` (not cover):
              cropping would clip the artwork, and the leftover box space is
              meant to stay transparent so the card's gradient shows through.
              Verified 47.33% fully-transparent pixels before wiring.

              Decorative: the band already carries its own title and subtitle, so
              `alt=""` keeps it out of the accessibility tree rather than
              announcing the same thing twice.
            */}
            <img
              className="mvp-home__promo-art"
              src={mediaUrl('academy')}
              alt=""
            />
            {/*
              The link STACKS UNDER the copy, inside the text column — it is not
              a sibling of the artwork (Gate 3c).

              This is Figma's own structure: `Frame 513` is the text column, and
              the link lives in `Frame 514` INSIDE it, below the subtitle and
              right-aligned. The MVP had the link as a third flex sibling, which
              was harmless while there were only two children — but once the
              illustration landed, `art + text + link` overflowed the 319.2px
              content box and the text column absorbed the whole shortfall,
              wrapping both lines. Nesting it is the structural fix; a margin
              would only have moved the squeeze around.
            */}
            <div className="mvp-home__promo-text">
              <p className="type-body-m-semibold mvp-home__promo-title">
                {ACADEMY_PROMO.title}
              </p>
              <p className="type-body-caption mvp-home__promo-subtitle">
                {ACADEMY_PROMO.subtitle}
              </p>
              {/*
                `Frame 514`'s equivalent. It exists because `Link` exposes no
                `className`, so the only way to right-align it without naming a
                DS class from MVP CSS is an MVP-owned element around it — which
                is also exactly how Figma models it.
              */}
              <div className="mvp-home__promo-action">
                <Link
                  label={ACADEMY_PROMO.linkLabel}
                  size="s"
                  appearance="inverse"
                  /*
                    `iconBefore={null}` ONLY — the leftover half of item A. `Link`
                    defaults BOTH icon slots to `<Icon name="open_in_new">`, and a
                    default parameter fires on `undefined`, so omitting `iconBefore`
                    drew a stray `open_in_new` here. Figma inspects this link at
                    63x16 WITH its chevron, so `iconAfter` is deliberately untouched.
                  */
                  iconBefore={null}
                  iconAfter={<Icon name="chevron_right" size="xs" />}
                  onClick={(e) => e.preventDefault()}
                />
              </div>
            </div>
          </div>

          <div className="mvp-home__feature-row">
            {FEATURE_CARDS.map((card) => (
              <CardFeaturesAndEducation
                key={card.id}
                sizing="fill"
                variant={card.variant}
                title={card.title}
                icon={<Icon name={card.icon} size="m" />}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

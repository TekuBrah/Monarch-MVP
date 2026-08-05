import type { FeatureCard, PromoMessage, SmartInsight } from './types'

/**
 * Homepage_Fiat's editorial blocks: the Smart Insights carousel, the Monarch
 * Academy promo, and the features-and-education tiles.
 *
 * COLOUR DISCIPLINE (architecture §3.4, inventory §7). Not one hex value
 * appears below. Two mechanisms carry every bit of colour:
 *
 * - `titleToken` holds a token NAME as a plain string. The screen composes
 *   `var(--<name>)`, which the DS `CardSmartInsights` accepts through its
 *   `titleColor` prop — documented there as "CSS color (e.g.
 *   var(--brand-cyan-500))".
 * - `variant` on the feature tiles is a DS enum. The tile's own CSS resolves it
 *   to `--brand-orange-400` / `--brand-green-400` / `--brand-purple-400`; the
 *   MVP never names the value.
 *
 * That is the "identity carried by a component, not by a value" shape the
 * inventory's colour register asks Flow 1 to be pushed toward.
 */

export const SMART_INSIGHTS: SmartInsight[] = [
  {
    id: 'grocery-promo',
    title: 'Save 30%',
    titleToken: 'brand-cyan-500',
    description: 'Grocery promotions available nearby',
    icon: 'icon_grocery',
    linkLabel: 'View',
  },
  {
    id: 'subscriptions-due',
    title: 'RM 140.82',
    titleToken: 'mapped-text-default-default',
    description: 'left to pay by 31 July',
    logos: ['netflix', 'maybank'],
    logoOverflow: 2,
    linkLabel: 'Plan',
  },
  {
    id: 'healthcare-trend',
    title: '- RM 580',
    titleToken: 'mapped-text-error-default',
    description: 'Healthcare spending up 12% vs last month',
    icon: 'icon_healthcare',
    linkLabel: 'Plan',
  },
]

/**
 * The `❖ System message` block.
 *
 * A6 — RESOLVED. The Section placement (`0:569`) renders a literal `{title}`
 * placeholder above real copy. The MAIN COMPONENT it is an instance of
 * (`934:8630`) renders "Monarch Academy" in that same slot, so the real copy
 * already exists in the file and did not have to be written. Per the standing
 * note that 5.3 reads from main components rather than Section placements, that
 * is what is used here — no invented headline.
 */
export const ACADEMY_PROMO: PromoMessage = {
  id: 'academy',
  title: 'Monarch Academy',
  subtitle: 'Master Your Money & Monarch',
  linkLabel: 'Explore',
}

export const FEATURE_CARDS: FeatureCard[] = [
  {
    id: 'stocks',
    title: 'Buy and sell stocks',
    icon: 'icon_stocks',
    variant: 'orange',
  },
  {
    id: 'track-spending',
    title: 'Track Spending',
    icon: 'icon_track_spending',
    variant: 'green',
  },
  {
    id: 'smart-insights',
    title: 'Smart Insights',
    icon: 'icon_aiinsights',
    variant: 'purple',
  },
]

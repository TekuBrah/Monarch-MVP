import { Route, Routes } from 'react-router-dom'
import { AppShell } from './shell/AppShell'
import { ComingSoon } from './components/ComingSoon'
import { FinanceScreen } from './flows/finance/FinanceScreen'
import { HoldingDetailScreen } from './flows/finance/HoldingDetailScreen'
import { HomepageScreen } from './flows/homepage/HomepageScreen'

/**
 * The route table. One place to see every screen in the app (architecture
 * §1.5), which is worth the trivial rebase when two flow branches both append
 * a line here.
 *
 * Phase 5.3 Flow 1 — Homepage. Note what is NOT a route: the Accounts/Crypto
 * switch. Those are two selected-states of one screen, so they are Tabs state
 * inside `HomepageScreen` and the URL never changes (Flow 1 §3).
 *
 * The other three nav destinations and the Steward FAB target render the same
 * `ComingSoon` mechanism the Cards and Stocks tabs use — one mechanism, not a
 * second placeholder convention. Each becomes a real flow on its own branch.
 */
export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomepageScreen />} />

        <Route
          path="transfer"
          element={
            <ComingSoon
              title="Transfer"
              description="Send money and crypto to people and accounts."
              icon="icon_transfer"
            />
          }
        />
        {/*
          Flow 7. ONE route for the overview, whose five tabs are in-screen state
          the same way the Homepage's four are — and one route PER HOLDING for
          the drill-downs, because those genuinely are separate screens with
          their own chrome (B7: overview present, drill-downs suppressed).

          The holding is a route param, not a route-scoped provider (B8) — the
          data comes from the app-level `useAccounts()` every other screen reads.
        */}
        <Route path="finance" element={<FinanceScreen />} />
        <Route path="finance/holding/:holdingId" element={<HoldingDetailScreen />} />
        <Route
          path="more"
          element={
            <ComingSoon
              title="More"
              description="Profile, receipts, settings and everything else."
              icon="icon_more"
            />
          }
        />

        {/* The Steward FAB's destination. It renders and routes; the flow itself
            belongs to the Assistant Section, not this one. */}
        <Route
          path="steward"
          element={
            <ComingSoon
              title="Steward AI"
              description="Your money assistant. Coming with the Assistant flow."
              icon="icon_aiinsights"
            />
          }
        />
      </Route>
    </Routes>
  )
}

import { Route, Routes } from 'react-router-dom'
import { AppShell } from './shell/AppShell'
import { PlaceholderScreen } from './screens/PlaceholderScreen'

// Phase 4.7 — shell only. Three placeholder routes prove the router and the
// nav pattern; the real route table is Phase 5's.
export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<PlaceholderScreen title="Home" />} />
        <Route path="search" element={<PlaceholderScreen title="Search" />} />
        <Route path="settings" element={<PlaceholderScreen title="Settings" />} />
      </Route>
    </Routes>
  )
}

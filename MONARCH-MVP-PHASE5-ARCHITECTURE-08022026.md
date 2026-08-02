# Phase 5 — Feature Architecture Proposal (2026-08-02)

Three decisions, made once, before the 5.3 flow-build loop starts: **folder
structure**, **state management**, **mock data**.

Analysis and proposal only. Nothing in this document has been implemented. No
packages installed, no folders created, no source file edited. This report is
the only file written.

---

## ⚠️ Read this first — the stated basis for this decision does not exist yet

The task framed these decisions as "informed by the actual flow inventory from
5.1 and whatever the Figma file (verified reachable in 5.2) shows those flows
need, rather than guessed at blind."

**Neither 5.1 nor 5.2 has happened.** Verified this session, not recalled:

| Claimed input | Actual state |
|---|---|
| 5.1 flow inventory | **Does not exist.** Not produced in this session; no inventory file on disk. `MONARCH-MVP-HANDOFF-08012026.md` ends at "**NEXT — Phase 5:** starting at 5.1 — flow inventory from Figma," which is the last recorded state. |
| 5.2 Figma MCP verification | **Failed.** `http://127.0.0.1:3845/mcp` → "Unable to connect to the remote server." `Get-NetTCPConnection -LocalPort 3845` → nothing listening. The local desktop MCP server is not running. |

The prior session in this repo stopped before 5.1 — it halted at the environment
check on an unresolved DS-directory-access finding and never received a
go-ahead.

**So I have not seen a single screen of the Figma file.** I have written this
report from what is verifiable on disk, and I have marked every conclusion that
would move if the inventory contradicts it. Nothing below is presented as
derived from Figma, because none of it is.

**Recommended sequence: run 5.2 and 5.1 for real, then re-read Part 2 of this
document before implementing it.** Parts 1 and 3 are robust to what the
inventory says. Part 2 has one specific trigger that would flip it, named
explicitly in §2.4.

### What this report *is* grounded in — all verified this session

- `CLAUDE.md`, all five rules, read in full
- `scripts/check-tokens.mjs` — read line by line, so the rule-2 tension calls
  below are against the real matcher, not a description of it
- Current source tree: 10 files, `src/{shell,theme,screens}` + `App.tsx`
- `npm run lint:tokens` → **PASS**, 10 files, exit 0 (fresh run)
- `package.json` — `react-router-dom ^7.18.2` already present
- The DS's **public API as a consumer sees it**, read from this repo's own
  `node_modules/@monarch/design-system/dist/index.d.ts` — 46 components. No DS
  repo access used.

That last one is worth stating, because it is the closest thing to real signal
about the flows I have: the DS ships `SelectWalletAccount`, `ProgressStepper`,
`Field`, `Select`, `DatePicker`, `TimePicker`, `RangeSlider`, `TextArea`,
`Checkbox`, `Radio`, `Toggle`, `Modal`, `Toast`. That is a **financial/wallet
domain with real forms and at least one multi-step sequence**. It is a strong
hint. It is not an inventory, and I have not treated it as one.

---

## 1. Folder structure

### 1.1 Recommendation — flow-grouped folders, created one flow at a time

```
src/
  main.tsx                      # entry: fontsource imports + ThemeProvider + Router
  App.tsx                       # the single route table — every screen visible here
  index.css                     # base layer (4.7). Do not delete.

  shell/                        # existing — unchanged
    AppShell.tsx
    AppShell.css
    navItems.ts
  theme/                        # existing — unchanged
    ThemeProvider.tsx

  flows/
    onboarding/
      OnboardingWelcome.tsx
      OnboardingVerify.tsx
      OnboardingComplete.tsx
      onboarding.css
    accounts/
      AccountsList.tsx
      AccountDetail.tsx
      accounts.css
      components/               # ← appears only when 2+ screens in THIS flow share it
        AccountRow.tsx
    send/
      SendAmount.tsx
      SendRecipient.tsx
      SendReview.tsx
      SendConfirmation.tsx
      SendFlowProvider.tsx      # ← only if this flow needs cross-screen state (§2)
      send.css
    activity/
      ActivityList.tsx
      TransactionDetail.tsx
      activity.css
    settings/
      SettingsHome.tsx
      SettingsProfile.tsx
      SettingsSecurity.tsx
      settings.css

  components/                   # cross-flow COMPOSITION only (rule 4). Created on
    ScreenHeader.tsx            #   second use, never in anticipation.
    EmptyState.tsx

  data/                         # §3
    types.ts
    accounts.ts
    transactions.ts
```

**Flow names above are illustrative placeholders showing shape, not content.**
They are not from Figma. Substitute the real 5.1 flows; the structure is
independent of what they turn out to be.

Four rules make this work, and they matter more than the tree:

1. **The flow folder is the unit of work, because the branch is.** The handoff
   commits to "one branch per flow." A branch should map to one folder plus one
   line in the route table. That is the entire justification for grouping by
   flow rather than by kind — not scale speculation.
2. **`components/` subfolders appear on second use, never in anticipation.** A
   flow with one screen has no `components/`. Do not pre-create empty folders.
3. **Promote to `src/components/` only when a second *flow* needs it.** Until
   then it stays flow-local. This keeps the shared bucket small, which matters
   for rule 4 (below).
4. **CSS is colocated and imported by its screen**, extending the existing
   `AppShell.tsx` / `AppShell.css` convention rather than inventing a second one.

### 1.2 How this stays compatible with rule 4

Rule 4 allows MVP-local components for *composition* only, never primitives. The
structural safeguard is that **`src/components/` stays nearly empty**. A big
shared-components bucket is where primitives get born — someone needs a styled
container, drops it in `components/`, and the MVP has quietly grown a `Card`
the DS already ships. Requiring two flows before promotion keeps that bucket
small enough to eyeball.

The semantic test at review time: **a composition imports from
`@monarch/design-system`.** A local component that renders only raw DOM and no
DS import is the shape of a primitive, and should trigger rule 3 — stop and
report — rather than being written.

That heuristic could be mechanised the way rule 2 was, but **I am explicitly not
proposing that now.** There are zero local components today; a linter for a
violation that has never occurred is exactly the over-engineering this decision
is supposed to avoid. It is recorded here as the cheap option *if* rule 4 is
ever actually breached.

### 1.3 `npm run lint:tokens` — tension check

**No tension from the structure itself.** `check-tokens.mjs` walks `src/**`
recursively (`SCAN_DIRS = ['src']`, with only `node_modules`/`dist`/`.git`/
`.vite`/`coverage` skipped), so every folder proposed above is scanned
automatically. Nesting adds no blind spot and needs no config change.

**One real tension, and it grows with feature code.** The guardrail's documented
blind spot #1 is that unitless numeric px in JSX inline styles is invisible —
`style={{ padding: 16 }}` is an implicit 16px with no `px` text to match. Screen
layout code is precisely where that temptation lives, far more than in a shell
of 10 files. This is a rule-2 hole that will silently widen as ~20 screens land.

Mitigation, and it is a convention rather than a mechanism: **no inline style
objects in MVP source — layout goes in the colocated `.css` file.** This matches
the DS's own ban on inline styles (and the DS's `ElementWrapper` violating it is
already logged as a DS-side defect in the handoff). Flagging it rather than
glossing: if inline styles are used, `lint:tokens` will pass while rule 2 is
being broken.

### 1.4 Alternative considered and rejected

**Flat `src/screens/` holding all ~20 screens, with one shared
`src/components/`.** This is the simpler-looking option and it was a genuine
contender — at 20 files it is still navigable, and it needs no promotion rule.

Rejected for two reasons:

- **It does not match the unit of work.** With one branch per flow, a flat
  folder makes a branch's working set non-obvious — you cannot tell which of 20
  files belong to the flow you are building.
- **It has nowhere to put flow-local compositions**, so everything shared by two
  screens goes straight into the global `components/` bucket. That bucket is the
  rule-4 risk surface, and this layout pressurises it from day one.

Also considered and rejected quickly: **`components/{atoms,molecules,organisms}`**.
Atomic naming invites exactly the primitives rule 4 forbids — "atoms" is a
category that should be empty here, because it is the DS's job.

### 1.5 Cost if this turns out wrong

**Cheap.** Moving files and updating relative imports. No public API, no data
shape, no runtime behaviour. Under an hour at 20 screens, and mechanical enough
that a typo fails the build rather than shipping.

The single sharp edge, stated plainly: **the central route table in `App.tsx` is
touched by every flow branch**, so parallel branches will conflict there. With
sequential flow branches the conflict is one appended line and resolves in
seconds. I still recommend the central table — one place to see all 20 screens
is worth more than avoiding a trivial rebase. If it does become annoying, having
each flow export a `routes` array is a contained ~20-minute change.

---

## 2. State management

### 2.1 Recommendation — React context + hooks, scoped per flow, added on demand

No library. Concretely, three tiers:

| State | Mechanism | Scope |
|---|---|---|
| Theme | `ThemeProvider` (exists, works) | Global — already mounted |
| Per-screen UI state (a field, a toggle, an open modal) | `useState` in the screen | Local |
| Cross-screen state within one flow | One context provider **mounted as that flow's layout route** | That flow's subtree |

The third tier is the only new thing, and it should be added **only for flows
that demonstrably need it** — not created per flow as a matter of course.

The mounting mechanism already exists in this repo and needs nothing new.
`App.tsx` already nests routes under a layout element, and `AppShell.tsx`
already renders `<Outlet />`:

```tsx
<Route path="send" element={<SendFlowProvider />}>   {/* renders <Outlet/> */}
  <Route path="amount"    element={<SendAmount />} />
  <Route path="recipient" element={<SendRecipient />} />
  <Route path="review"    element={<SendReview />} />
</Route>
```

Two properties fall out of this for free, and they are the reason it is worth
preferring over a global store:

- **State is scoped to the flow by construction.** Leaving the flow unmounts the
  provider and the partial input is gone — which is the correct behaviour for an
  abandoned multi-step form, and something a global store has to be told to do.
- **There is no global object accumulating every flow's state**, so the usual
  context failure mode — one `AppStateContext` that everything reads — cannot
  develop.

**Follow `ThemeProvider.tsx` exactly as the template.** It is already the right
shape: `createContext<T | null>(null)`, a provider memoising its value, and a
`useTheme()` hook that throws outside the provider. Copy that structure; do not
invent a second convention.

### 2.2 The honest case *against* context, evaluated rather than dismissed

The standard objection is real and worth stating properly: **every consumer of a
context re-renders when its value changes, regardless of which field it used.**
In a large app this is a genuine performance problem and the reason
selector-based stores exist.

It does not bind here, and specifically:

- The app is a **mobile frame rendering one screen at a time** — on the order of
  tens of DOM nodes, not thousands. Even a worst-case full-subtree re-render is
  imperceptible.
- Flow contexts are scoped to 3–5 screens, of which **one is mounted at a time**.
  The consumer set is tiny by construction.
- Re-render cost scales with consumers × update frequency. Form input at human
  typing speed over a handful of components is nowhere near the threshold.

The `useMemo` on the provider value (as `ThemeProvider` already does) is the
standard mitigation and is sufficient at this scale.

The second objection — **provider nesting / "wrapper hell"** — also does not
bind: the deepest nesting this proposal reaches is Router → ThemeProvider →
AppShell → one flow provider. Four levels, one of which is conditional.

So: context is not being chosen because it is the default. It is being chosen
because **both of its known weaknesses are load-dependent, and this load is far
below where either starts to matter.**

### 2.3 Alternative considered and rejected

**Zustand** (the strongest candidate; Redux Toolkit and Jotai were considered
and are further from fitting).

Zustand is a fair contender and deserves its real advantages named: no provider
nesting, selector-based subscriptions that solve the re-render objection
properly, good devtools, and a `persist` middleware that would make §3's
persistence question a one-line config.

Rejected because **none of those advantages bind at this scale**, and each has a
cost that does:

- The re-render problem it solves is not occurring (§2.2).
- Its persistence middleware is a solution to a problem I am recommending
  against having (§3.3 — persistence is deliberately not wanted here).
- Automatic global scope is a **downside** for multi-step forms: the "abandon
  the flow, discard partial input" behaviour that route-scoped providers get for
  free has to be implemented as explicit reset calls, which is a thing to
  remember and get wrong.
- It is a new runtime dependency in a repo whose entire thesis is that the
  design system plus a thin consumer is sufficient. Every dependency is
  something the case study has to justify.

Rejecting it is not a claim that Zustand is heavy — it is ~1kB and genuinely
well-designed. It is a claim that it would be **load-bearing for nothing here**.

### 2.4 ⚠️ The trigger that flips this — and it is what the missing inventory decides

This is the recommendation most exposed to not having run 5.1. **Revisit if the
inventory shows any of the following:**

1. **State shared between non-adjacent flows** — an object mutated in flow A and
   read in flows C and D. Route-scoped providers cannot express this cleanly;
   lifting it to a global context starts recreating a store badly, and at that
   point use a real one.
2. **A single flow exceeding ~6 steps with back-navigation preserving partial
   input**, particularly with branching step order. Context still works, but the
   reducer gets big enough that a store's ergonomics start earning their keep.
3. **Optimistic updates with rollback** against async mock calls.

If 5.1 shows a wallet app with **transfer/send state crossing flow boundaries**
— plausible given the DS ships `SelectWalletAccount` — item 1 is live and this
section should be re-decided before implementation, not after.

Absent that evidence, adding a store now would be structure the inventory has
not asked for.

### 2.5 `npm run lint:tokens` — tension check

**None.** The guardrail matches colors, `px`, and font declarations. State code
in `.ts`/`.tsx` contains none of these. Contexts, providers, and hooks are
invisible to all four rules.

### 2.6 Cost if this turns out wrong

**Cheap — but only because of one discipline, which is free to adopt now.**

**Screens must consume flow state through a named hook (`useSendFlow()`), never
`useContext(SendFlowContext)` at the call site.** With that boundary, swapping
the implementation behind the hook to Zustand touches the provider file and
nothing else — every screen is untouched, because the hook's signature does not
change. Per flow, that is a single-file change.

Without that boundary, `useContext` calls spread across 20 screens and the
migration becomes a real refactor.

`ThemeProvider.tsx` already does this correctly. The cost of preserving the
property is zero; the cost of losing it is the difference between a contained
change and genuine rework. **This is the one piece of up-front structure worth
insisting on**, and it earns its place precisely because it is free.

---

## 3. Mock data

### 3.1 Recommendation — typed TypeScript modules in `src/data/`, synchronous, in-memory

**Shape: plain `.ts` modules exporting typed consts.** Not JSON.

```
src/data/
  types.ts          # Account, Transaction, … — the domain model
  accounts.ts       # export const ACCOUNTS: Account[] = [...]
  transactions.ts   # export const TRANSACTIONS: Transaction[] = [...]
```

Two reasons for `.ts` over `.json`:

- The data is **type-checked against the domain model**, so a malformed fixture
  fails `npm run build` instead of rendering blank at runtime.
- `types.ts` becomes the single written definition of the domain, which is what
  screen props are typed against. With JSON you end up maintaining the types
  separately anyway.

**Location: `src/data/`, cross-cutting — not inside flow folders.** Domain
entities are shared: an account appears in the accounts list, in the send flow,
and on a transaction detail screen. Data does not partition by flow, so filing
it under one flow makes the other flows import across sibling folders — the
worst of both.

**Access: synchronous imports by default.** No fake-async layer, no promises, no
artificial latency. Screens import what they need directly.

The deliberate exception: if the Figma shows a **designed loading state** (the
DS ships `Loader`, `ProgressBar`, and `ProgressRing`, so it plausibly does),
wrap *those specific* reads in a ~10-line async helper. Build that when a design
calls for it — not speculatively for every screen. A demo where every screen
flashes a spinner is worse than one that renders instantly.

### 3.2 Persistence — stated plainly: **none. In-memory only, resets on reload.**

No `localStorage`, no `sessionStorage`, no IndexedDB. Every reload returns the
app to the shipped seed data.

Three reasons, in order of weight:

1. **Persisted mock data drifts from the seed data and produces phantom bugs.**
   Edit `accounts.ts`, reload, and the app still shows the old data from
   storage — because the persisted copy wins. You then debug a data problem that
   does not exist in the source. This is a maintainability argument, and it is
   the strongest one.
2. **A demo should open in its designed state.** For a portfolio artifact, a
   visitor should see what was designed, not the residue of whoever clicked
   through it before them. Reload-resets means the known-good state is always one
   refresh away — which is exactly what you want when demoing live.
3. **It is zero code.** Persistence is a feature with a maintenance cost, and
   nothing in a demo requires it.

**One genuine exception worth deciding separately: the theme preference.**
`ThemeProvider` currently hard-starts at `'light'` (`useState<Theme>('light')`),
so a dark-mode visitor who reloads is thrown back to light. That is the one
place persistence would improve the artifact rather than complicate it, and it
is a ~3-line change reading `localStorage` in the `useState` initialiser.

**I have not made that change** — this is analysis only, and it is arguably a
separate decision from "mock data" anyway. Flagged as a candidate, not done.

### 3.3 Alternative considered and rejected

**localStorage-backed mock store** — rejected for reasons 1 and 2 in §3.2. The
drift failure mode in particular is not theoretical; it is the standard way
persisted-fixture demos break, and it breaks in a way that looks like an
application bug.

**MSW (Mock Service Worker) or `json-server`** — rejected as clear
over-engineering. Both exist to mock a *network layer*. This app has no network
layer, no backend intent, and no fetch calls. Adding a service worker and
handler files to serve data that could be an `import` is ceremony with no payoff,
plus a dependency and a build-config surface.

### 3.4 ⚠️ `npm run lint:tokens` — a real tension here, and it is the non-obvious one

**`src/data/*.ts` is scanned by the guardrail.** `EXTS` includes `.ts`, and
`SCAN_DIRS` is `['src']`. Mock data is not exempt.

The concrete risk: **mock entities in a financial app very often carry a
color** — an account accent, a category swatch, a tag hue, an avatar background.
Writing `color: '#4F46E5'` in `accounts.ts` is a `raw-hex-color` violation and
will fail the build gate. Regex `/#(?:[0-9a-fA-F]{8}|{6}|{4}|{3})(?![0-9a-zA-Z_-])/`
matches inside string literals — it does not care that it is data rather than
CSS.

This is easy to walk into, because "it is only mock data" feels like it should
not count. Under rule 2 it does.

Resolution, in order of preference:

1. **Prefer a DS component's own variant prop.** If `Tag` or `Badge` exposes a
   color/variant prop, the mock stores the variant name — a plain string, no
   literal, no violation.
2. **Otherwise store a token *name*, not a value** — e.g.
   `accentToken: 'mapped-surface-primary-default'` — and let the component
   compose `var(--…)`. The data file then contains no color literal at all.
3. **If the design assigns per-entity colors with no backing token**, that is a
   token gap, not a data problem. Per rule 3's spirit and the DS's token-gap
   protocol, **stop and report** rather than inlining hex.
4. **`token-exempt: <reason>`** only as a deliberate, visible last resort. The
   guardrail prints every exemption in its summary specifically so these stay
   countable.

Secondary, lower risk: any mock *string* containing a px-like token (a
description, a filename, a spec label) trips `raw-px`. Unlikely, but it is why
mock copy should be read once if the gate fails somewhere surprising.

### 3.5 Cost if this turns out wrong

**Cheap in the directions that are plausible; genuine rework only in a direction
that is out of scope.**

- **Adding localStorage later** — wrap the relevant `useState` in a
  `usePersistedState` hook. Contained, one file per flow that needs it.
- **Adding fake async later** — the mechanical change is `import { ACCOUNTS }`
  → `await getAccounts()` plus a loading state, per consuming screen. Tedious at
  20 screens but entirely mechanical, and only affects screens that actually
  need a loading state.
- **Swapping to a real backend** — genuine rework. But an actual backend is
  explicitly not a goal of this artifact, so this is not a risk being run so much
  as a road not taken.

The property that keeps the first two cheap is that **`types.ts` does not
change** in any of them. The domain model is the stable part; how it is fetched
and stored is the swappable part.

---

## Summary

| | Recommendation | Rejected | Cost to change |
|---|---|---|---|
| **Folders** | Flow-grouped `src/flows/<flow>/`, shared bucket on second use | Flat `src/screens/` | Cheap — file moves |
| **State** | Context + hooks, route-scoped per flow, added on demand | Zustand | Cheap **if** consumed via named hooks |
| **Mock data** | Typed `.ts` in `src/data/`, sync, **in-memory only** | localStorage; MSW | Cheap — `types.ts` stays fixed |

**Rule compliance:** nothing proposed defines a component that duplicates a DS
component (rule 1); no raw values are introduced, and the two places rule 2 is
at risk are flagged with resolutions rather than glossed (§1.3, §3.4); no
primitive is built locally, and the promotion rule plus the DS-import heuristic
are what hold rule 4 (§1.2); rule 3 is the named escape route for the
per-entity-color token gap; nothing here touches a remote (rule 5).

**Two outstanding flags, neither resolved by this document:**

- **§2 is contingent on the 5.1 inventory.** Run 5.2 and 5.1 for real, then
  re-read §2.4 before implementing. If flow-crossing state exists, that section
  gets re-decided.
- **The DS-directory access finding from the prior session is still open.**
  `.claude/settings.local.json` still carries five Phase 4 allowlist entries
  (lines 10, 14, 15, 17, 28) that read the DS repo prompt-free. Read-only, but
  contrary to this session's stated scoping.

**STOP.** No implementation, no folder creation, no package installs, and no
5.3 work without explicit per-flow go-ahead.

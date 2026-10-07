import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { CRYPTO_HOLDINGS, CRYPTO_WALLETS, FIAT_ACCOUNTS } from '../data/accounts'
import { COMMITMENTS } from '../data/commitments'
import { COMMITMENT_OFFERS } from '../data/offers'
import { GOALS } from '../data/goals'
import { buildHoldings } from '../data/holdings'
import { RECEIPTS } from '../data/receipts'
import { TRANSACTIONS } from '../data/transactions'
import {
  backfillAddedAt,
  backfillReferences,
  cryptoWalletChange,
  cryptoWalletTotal,
  netWorth,
  netWorthSeries,
  toSen,
} from '../data/derive'
import type {
  Amount,
  Commitment,
  CommitmentOffer,
  CryptoHolding,
  CryptoWallet,
  FiatAccount,
  Goal,
  GoalAutoSave,
  GoalImageOrigin,
  Holding,
  Receipt,
  Transaction,
} from '../data/types'

/**
 * App-level accounts state.
 *
 * Mounted above the router because the inventory's §4b W1 makes the balance a
 * genuine cross-flow value: written by the Flow 4/5 transfers and the Flow 11
 * goal top-up, read by the Homepage, Academy, the Assistant and Finance
 * Overview. A route-scoped provider could not express that.
 *
 * Shape and conventions are copied from `theme/ThemeProvider.tsx` rather than
 * invented: `createContext<T | null>(null)` and a named hook that throws outside
 * the provider. Architecture §2.6 is the reason that matters — screens consume
 * `useAccounts()` and never `useContext(...)`, so if this ever needs to become a
 * store, this file changes and no screen does.
 *
 * NOT PERSISTED (architecture §3.2). Reload returns the seed data.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * GATE 48 — THE LEDGER STOPPED BEING FROZEN, AND THAT IS ALL THAT CHANGED.
 *
 * This was a single `useMemo` over imported constants: it re-EXPOSED
 * `TRANSACTIONS` and could not be written to at all. The ledger is now `useState`
 * seeded from the same import, and `addTransaction` appends to it.
 *
 * NO TRANSACTION-CREATION UI WAS BUILT AND NONE SHOULD BE READ INTO THIS. The
 * seam exists because Flow 9's later gates need somewhere for a created row to
 * go, and because building the writer at the same time as its first caller is
 * how a provider ends up with mutators nobody agreed the shape of. `addTransaction`
 * has ZERO call sites today — that is deliberate and is not an oversight.
 *
 * `receipts` IS A PEER COLLECTION IN THIS SAME PROVIDER, NOT A THIRD PROVIDER.
 * Nearly every Flow 9 surface queries BOTH — the Receipts tab pairs a receipt
 * with its transaction, and every ledger row asks whether a receipt exists for
 * it — so a separate `ReceiptsProvider` would mean two contexts read together at
 * essentially every call site, with no boundary between them that means anything.
 * The two collections join on `Transaction.id`; a provider boundary running
 * through the middle of a join is a boundary in the wrong place.
 *
 * IT IS `useState` TOO, AND THAT BET PAID OFF ONE GATE EARLY. The reason given
 * at Gate 48 was that Gate 51 would need to write `Receipt.transactionId`, so
 * seeding it as state then meant that gate would add a mutator rather than
 * restructure the provider. GATE 49 IS THE GATE THAT NEEDED IT: the detail
 * sheet's "Unlink receipt" writes exactly that field, and it cost one
 * `useCallback` and one line in the value object. Nothing else moved.
 *
 * SO THERE ARE NOW NINE MUTATORS, AND TWO OF THEM STILL HAVE NO CALLER. This
 * line said "two" from Gate 49, was stale from Gate 50 when `addReceipt`
 * arrived, and was corrected at Gate 51 for `deleteReceipt`; Gate 51-B adds
 * `linkReceipt` and `updateReceipt`, Gate 61 `replaceReceipt`, Gate 75
 * `adjustFiatBalance`, and Gate 81 `topUpGoal`. SEVEN have callers;
 * `addTransaction` and `adjustFiatBalance` have none and are both seams. Do not
 * sweep either as dead code — and note that `topUpGoal` arriving does NOT
 * discharge them: it writes the ledger and a balance itself rather than calling
 * through either, because a Top-Up is one operation and those two are halves.
 *
 * ⚠ SIX OF THE NINE WRITE `receipts` AND NOTHING ELSE, AND THE SENTENCE THAT
 * USED TO FOLLOW IS NOW FALSE. It read: "no user action in this app can
 * currently change a transaction OR a balance — that is the P6 ruling made
 * structural rather than promised". GATE 81 ENDED THAT. `topUpGoal` is the
 * first mutator a user can fire that writes the ledger and moves money, so the
 * structural guarantee is gone and only the narrower one survives: **receipts
 * never rewrite the bank**. Every receipt mutator still writes `receipts` alone,
 * which is the half P6 actually asserts, and `setTransactions` now has exactly
 * two call sites — `addTransaction`, still caller-less, and `topUpGoal`.
 *
 * `fiatAccounts` IS STATE AS OF GATE 75, AND `holdings` IS DERIVED FROM IT.
 * Those two had to move together: `netWorth`, `netWorthSeries` and the two bank
 * cards all read `holdings`, so live accounts beside a frozen `HOLDINGS` seed
 * would have left the Homepage's balance card disagreeing with every net-worth
 * surface, with nothing reporting it. See `buildHoldings` in `holdings.ts`.
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IS STILL NOT SOLVED, stated so it is not mistaken for solved. This is a
 * provider holding two arrays, not a store. There is no reducer, no action
 * vocabulary, no persistence and no undo. When a flow first needs two collections
 * to change together — creating a transaction AND linking a receipt to it in one
 * user action — that is the day this becomes a reducer, and every screen still
 * reads `useAccounts()` so no screen moves.
 */

/**
 * THE EDITABLE FACE OF A GOAL — everything `updateGoal` may write.
 *
 * `id` and `savedAmount` ARE ABSENT ON PURPOSE. The first is identity and the
 * second is money, and neither belongs to a settings form. Spreading this over
 * a record therefore cannot touch either, so the rule is structural rather than
 * a line of validation somebody could delete. Same shape as `ReceiptEdit`,
 * which keeps `id`, `filename` and `transactionId` out of reach.
 *
 * THE IMAGE PAIR IS OPTIONAL AND MOVES TOGETHER. The settings form does not
 * touch the image and the image picker touches nothing else, so each writer
 * supplies the half it owns — but `image` without `imageOrigin` would leave
 * the resolver reading an object URL as a filename, which is why they are
 * written in one call or not at all.
 */
export interface GoalEdit {
  name: string
  targetAmount: Amount
  targetDate: string
  fundingAccountId: string
  autoSave: GoalAutoSave
  image?: string
  imageOrigin?: GoalImageOrigin
}

interface AccountsContextValue {
  fiatAccounts: FiatAccount[]
  /** The account the Homepage's balance card shows. */
  primaryAccount: FiatAccount
  cryptoWallets: CryptoWallet[]
  cryptoHoldings: CryptoHolding[]
  /** DERIVED — `sum(holdings)`, never a stored constant (inventory §6b). */
  cryptoTotal: Amount
  /** DERIVED — from each holding's own move, not transcribed. */
  cryptoChange: { amount: Amount; pct: number }
  transactions: Transaction[]

  // ------------------------------------------------------------- Flow 7
  /**
   * Everything net worth is a sum of — the nine Finance Overview cards.
   *
   * ADDITIVE. Flow 7 widens this value object and changes NO existing field, so
   * not one Flow 1 call site moved. That is the property §2.6 was set up for.
   */
  holdings: Holding[]
  /** DERIVED — `sum(holdings)`. Never stored, never transcribed (B1). */
  netWorth: Amount
  /** DERIVED — month-to-date, one point per elapsed day (B6). */
  netWorthSeries: number[]

  // ------------------------------------------------------------- Flow 9
  /**
   * Captured receipts. A PEER of `transactions`, joined on `Transaction.id`.
   *
   * This is also the sole statement of which transactions have a receipt —
   * `Transaction.hasReceipt` was deleted at Gate 48. Ask
   * `transactionHasReceipt(receipts, id)` in `derive.ts`, never a field on a row.
   */
  receipts: Receipt[]

  // ------------------------------------------------------------ Flow 11
  /**
   * The savings goals. Money the user owns, held outside the two cash accounts.
   *
   * STATE RATHER THAN A RE-EXPORTED CONSTANT, because Gate 79 writes these —
   * Add a Goal, Edit, Delete and Top-Up all change a goal or its `savedAmount`.
   * The mutators arrive there, WITH their first callers, which is the rule that
   * kept `addTransaction` from being designed in the abstract.
   *
   * THEY LIVE HERE RATHER THAN IN A `PlansProvider` because a goal is money that
   * interacts with accounts: a Top-Up debits a cash account and credits a goal in
   * one user action, and a provider boundary running through the middle of that
   * is a boundary in the wrong place — the argument that made `receipts` a peer
   * of `transactions` rather than a third provider.
   */
  goals: Goal[]
  /**
   * The recurring commitments.
   *
   * A PLAIN CONSTANT PASSED THROUGH, NOT STATE, and the asymmetry with `goals`
   * is deliberate: `Commitment` is READ-ONLY IN FLOW 11 (see its docstring), so
   * `useState` here would be machinery with nothing able to move it — the shape
   * Gate 48 declined for exactly this reason. It still reaches every screen
   * through `useAccounts()`, so the day a flow writes one, this becomes state
   * and not one consumer moves (B8).
   */
  commitments: Commitment[]
  /**
 * The cheaper plans Monarch has spotted, one per commitment at most.
   *
   * A PLAIN CONSTANT PASSED THROUGH, for the same reason `commitments` is:
   * nothing writes an offer in Flow 11. "Remind Me Later" and "View Promotion"
   * are the two writers the design implies, and both show a "Coming soon."
   * toast under the MVP scope rule rather than moving data.
   *
   * READ THROUGH `commitmentOffer(offers, id)`, never indexed by position —
   * the seed holds one and the lookup is by `commitmentId`.
   */
  commitmentOffers: CommitmentOffer[]

  /**
   * Append a transaction to the ledger.
   *
   * THE SEAM, WITH NO CALLER. See the block comment above: Flow 9's later gates
   * need this and building it alongside its first consumer is how a provider
   * grows a mutator nobody designed. It appends and does nothing else — no
   * sorting (every consumer already sorts by date), no id generation (the caller
   * owns identity), no validation.
   */
  addTransaction: (transaction: Transaction) => void
  /**
   * Move a cash account's balance by `delta` — negative to debit.
   *
   * THE SECOND SEAM WITH NO CALLER, and the first one that writes money. Gate
   * 79's Top-Up debits the source account and credits a goal; this is the
   * account half. `addTransaction` remains the Gate 48 seam beside it, and
   * neither is dead code — see the block comment above.
   *
   * IT TAKES A DELTA, NOT A NEW BALANCE, because every caller knows how much
   * moved and only this function should have to know what the balance was. A
   * setter would make two concurrent writes race on a figure each had read
   * before the other landed; a delta composes.
   *
   * IT ADDS IN WHOLE SEN. Two float additions do not reliably land on a
   * two-decimal figure, and a balance that drifts by a hundredth is a balance
   * that stops matching the ledger it was derived from — the same reason
   * `budgetSpent` sums in sen.
   */
  adjustFiatBalance: (accountId: string, delta: Amount) => void
  /**
   * ─────────────────────────────────────────────────────────────────────────
   * MOVE MONEY FROM A CASH ACCOUNT INTO A SAVINGS GOAL — Gate 81, and the
   * FIRST WRITE IN THIS APP THAT MOVES MONEY.
   *
   * THREE MUTATIONS, ONE OPERATION, AND IT TAKES THE LEDGER ROW AS ITS ONLY
   * ARGUMENT. That signature is the whole design. A
   * `(goalId, accountId, amount)` form would let a caller debit one account
   * while writing a row that names another, or credit a goal by a figure the
   * row does not state — three facts, three chances to disagree. Here THE ROW
   * IS THE INSTRUCTION: the account comes from `accountId`, the goal from
   * `goalId`, and both balances move by `amount`, so "the ledger, the account
   * and the goal agree" is true by construction rather than by the caller
   * being careful.
   *
   * WHY IT IS ONE MUTATOR AND NOT THREE CALLS AT THE CALL SITE. The three
   * pieces of state are three different atoms, so unlike `linkReceipt` they
   * cannot be collapsed into a single `setX`; what CAN be collapsed is the
   * contract. One named operation with one documented meaning is what makes
   * "a Top-Up" a thing the provider does, rather than a sequence a screen
   * happens to perform in the right order.
   *
   * ATOMIC IN THE ONLY SENSE THAT CAN BE OBSERVED HERE. React 18's automatic
   * batching (`createRoot`, `main.tsx`) applies all three updates before it
   * renders, so NO RENDER EVER SEES A PARTIAL WRITE — there is no frame in
   * which the money has left the account and not yet reached the goal. That is
   * the same guarantee `replaceReceipt` reasons about, reached a different way
   * because the state is split rather than shared.
   *
   * IT THROWS ON A MALFORMED ROW rather than writing half of one. Every clause
   * is a programmer error, not a user error — the form cannot produce any of
   * them — and a silent no-op would leave a user looking at an unchanged
   * screen with no reason. `addedAtOf` takes the same position.
   *
   * NOT PERSISTED. Reload restores the seed, like every other write here.
   * ─────────────────────────────────────────────────────────────────────────
   */
  topUpGoal: (contribution: Transaction) => void
  /**
   * CREATE A GOAL. It starts at `savedAmount: 0` and there is no second path.
   *
   * FIGMA'S ADD-A-GOAL FORM CAPTURES NO INITIAL DEPOSIT — measured off
   * `1266:14340`: Goal Name, Target Amount, Target date, Auto-Save Amount /
   * Month plus its toggle, Funding Source. So nothing here moves money, and
   * nothing needs to: if a deposit is ever drawn it routes through
   * `topUpGoal`, which is the one way money enters a goal.
   *
   * THE CALLER SUPPLIES THE WHOLE RECORD, id included, for `addReceipt`'s
   * reason: a provider that minted ids would have to know what a goal id looks
   * like, and the screen that built the record already does.
   */
  createGoal: (goal: Goal) => void
  /**
   * CHANGE A GOAL'S SETTINGS. Name, target, date, funding account, auto-save
   * and image — never `savedAmount`.
   *
   * `GoalEdit` CANNOT EXPRESS A BALANCE CHANGE, which is how that is enforced
   * rather than promised: the field is not in the type, so `updateGoal` could
   * not write it if a caller asked. Money enters a goal only through
   * `topUpGoal` and leaves it only through `deleteGoal`. Same shape as
   * `ReceiptEdit`, which keeps `id`, `filename` and `transactionId` out of
   * reach for the same reason.
   */
  updateGoal: (goalId: string, changes: GoalEdit) => void
  /**
   * CLOSE A GOAL AND RETURN WHAT IT HELD.
   *
   * ⚠ THE REFUND IS THE SECOND ARGUMENT AND IT IS NOT OPTIONAL-BY-TASTE. A goal
   * holding money MUST be closed with a row that returns it, and a goal holding
   * nothing MUST be closed without one — both are checked here against the LIVE
   * goal, so neither a silently destroyed balance nor a phantom RM 0.00 row can
   * get through. `null` is the explicit "there was nothing to return", not an
   * omission.
   *
   * WHY NOT `topUpGoal`'S ONE-ARGUMENT SHAPE. "The row is the instruction"
   * works there because every top-up has a row. A zero-balance goal has none,
   * so a row alone cannot name what to delete. The goal id is therefore the
   * instruction and the row is the money, and the provider checks that they
   * agree — the row must carry this `goalId`, credit this goal's OWN funding
   * account, and return exactly `savedAmount`.
   *
   * ATOMIC ACROSS THREE ATOMS, `topUpGoal`'s mechanism: React 18 batches all
   * three updates before the render, so no render sees a goal that has been
   * emptied but not removed, or money that has left without arriving.
   *
   * NET WORTH DOES NOT MOVE. The refund takes the balance out of
   * `goalsTotal(goals)` and puts it into a cash account inside
   * `sum(holdings)`, which are the two terms `netWorth` adds — the same
   * identity a Top-Up satisfies in the other direction.
   */
  deleteGoal: (goalId: string, refund: Transaction | null) => void
  /**
   * Break a receipt’s link to its transaction. Gate 49.
   *
   * THE FIRST MUTATOR IN THIS PROVIDER WITH A CALLER — `addTransaction` above
   * is still the seam it was built as. The detail sheet’s "Unlink receipt"
   * button is the only call site.
   *
   * IT SETS `transactionId` TO `null` AND DELETES NOTHING. The capture still
   * exists, still has its image and its line items, and still appears on the
   * Receipts tab — as the `Linked=No` variant `ReceiptCard` already draws and
   * `Receipt.transactionId` was already typed for. Unlinking is not deleting.
   *
   * THE TRANSACTION’S AMOUNT DOES NOT MOVE, BY RULING. Gate 48 corrected every
   * linked amount to its receipt’s printed total on the argument that the
   * receipt is a photograph of what was actually paid. Unlinking does not
   * un-photograph it, so reverting the amount would be re-asserting a figure
   * that was authored before any receipt existed and is known to be wrong.
   *
   * WHAT DOES CHANGE, AND IT IS THE WHOLE POINT OF THE DERIVED RULING: every
   * surface that asks `transactionHasReceipt(receipts, id)` re-answers on the
   * next render with nothing else updated. The ledger row’s `receipt_long`
   * glyph disappears because the question is asked of this collection, not of
   * a boolean on the row. Under the pre-Gate-48 stored flag this mutator would
   * have had to write BOTH collections and would have been one forgotten line
   * away from a row claiming a receipt that no longer claims it.
   *
   * NOT PERSISTED. Reload restores the seed, like every other write here.
   */
  unlinkReceipt: (receiptId: string) => void
  /**
   * Add a captured receipt to the library. Gate 50.
   *
   * THE SECOND MUTATOR WITH A CALLER, and `addTransaction` above is STILL the
   * zero-caller seam Gate 48 built — do not sweep it as dead code on the
   * strength of this one arriving.
   *
   * LINKAGE IS THE CALLER'S, NOT THIS FUNCTION'S, and that is the capture-context
   * ruling made concrete: a receipt captured FROM a transaction arrives with
   * `transactionId` already set, because it is linked to that transaction by
   * definition; one captured from the Receipts tab arrives with whatever
   * auto-match decided BEFORE it was built (Gate 50-C) — an id when exactly one
   * transaction matched, `null` otherwise. A mutator that tried to decide would
   * have to guess at the context it was called from.
   *
   * SO AUTO-MATCH NEEDED NO LINK MUTATOR. It decides `transactionId` before the
   * receipt exists and this appends it — writing the receipt collection only,
   * never the ledger, which is why an auto-link cannot move an amount.
   *
   * IT APPENDS AND DOES NOTHING ELSE — no sorting (`groupReceiptsByMonth` sorts),
   * no id generation (the caller owns identity), no validation, no de-duplication.
   * The same contract `addTransaction` documents.
   *
   * NOT PERSISTED. Reload restores the seed — and for a captured receipt that is
   * more than a convention: its image is a blob url that does not survive the
   * document that made it. See `Receipt.sourceUrl`.
   */
  addReceipt: (receipt: Receipt) => void
  /**
   * Remove a receipt from the library. Gate 51.
   *
   * THE THIRD MUTATOR WITH A CALLER — the receipt viewer's "Delete receipt",
   * behind a confirmation modal. `addTransaction` is STILL the zero-caller seam.
   *
   * IT WRITES THE RECEIPT COLLECTION AND NOTHING ELSE, EVER — NEVER THE LEDGER.
   * A linked transaction becomes receipt-less through the derived
   * `transactionHasReceipt` and ITS AMOUNT DOES NOT CHANGE. Delete is unlink plus
   * removal, and `unlinkReceipt` above never reverted an amount (Gate 49's
   * ruling, extended).
   *
   * A CAPTURE'S BLOB URL IS REVOKED, because nothing can show it again once its
   * record is gone and leaving it would hold the image for the life of the tab.
   * Seeded receipts carry no `sourceUrl`, so for them this only removes.
   *
   * AUTO-MATCH DOES NOT RE-RUN. It is locked to once, at add time (Gate 50-C),
   * so the transaction a delete frees stays receipt-less until a NEW capture
   * matches it.
   *
   * NOT PERSISTED. Reload restores the seed — the deleted receipt included.
   */
  deleteReceipt: (receiptId: string) => void
  /**
   * Link a receipt to a transaction by hand — the picker's write. Gate 51-B.
   *
   * THE RECOVERY PATH FOR EVERY AUTO-MATCH MISS. Gate 50-B measured the real
   * engine linking 5 of 10 seeded receipts unaided; the other five failed on a
   * field the photograph did not yield (two unread dates, one date misread by
   * six months, two letterheads read as an address line or a line item), and no
   * matcher can recover those. This is how a user does it instead.
   *
   * IT SWAPS. If another receipt already points at that transaction, THAT
   * receipt's `transactionId` becomes `null` in the SAME update — the displaced
   * capture returns to the library unlinked rather than being deleted, and the
   * transaction never ends up claimed by two receipts at once. One
   * `setReceipts` call and one `map`, never two writes: two would render an
   * intermediate frame in which both receipts claim the row.
   *
   * IT NEVER CALLS `setTransactions`, AND THAT ABSENCE IS THE CONTRACT — the
   * same one `deleteReceipt` above documents. A hand-link does not move the
   * ledger amount it links to, so a receipt total that differs from the
   * transaction's amount is SHOWN by the viewer and not reconciled. Receipts
   * never rewrite the bank.
   *
   * AUTO-MATCH DOES NOT RE-RUN, here or anywhere. It is locked to once, at add
   * time (Gate 50-C).
   *
   * NOT PERSISTED. Reload restores the seed.
   */
  linkReceipt: (receiptId: string, transactionId: string) => void
  /**
   * Correct what extraction read off a receipt — the editor's write. Gate 51-B.
   *
   * THE THREE FIELDS A USER CAN SEE AND CHECK AGAINST THE PHOTOGRAPH, and no
   * others: merchant, timestamp and total. `tax` and `lineItems` are not
   * editable and are not surfaced by the editor at all — correcting a line item
   * is transcription work, not correction of a misread, and there is no drawn
   * surface for it.
   *
   * THIS IS WHAT REPLACED PER-FIELD CONFIDENCE MARKING. Gate 50-B measured
   * Tesseract's per-word confidence against ground truth over all ten seeded
   * receipts and found it does not discriminate — AUC 0.642, precision never
   * above 0.231, and the one genuinely wrong SST figure (7.19 for a printed
   * 7.79) scoring 77, the exact median of the CORRECT population. So: parse
   * everything, mark nothing, and let a human correct any field.
   *
   * `capturedAt` IS A ZONE-LESS LOCAL WALL-CLOCK STRING, composed from the
   * date and time the user typed. It is never round-tripped through
   * `toISOString` — see `localWallClock` in `receiptCapture.ts` for the bug
   * that convention exists to prevent.
   *
   * IT NEVER CALLS `setTransactions` EITHER, for the same reason `linkReceipt`
   * does not: editing a total to what the paper actually prints does not
   * authorise this app to move a bank figure. AND IT NEVER RE-RUNS AUTO-MATCH —
   * that is locked to add time, and re-running it after an edit would re-link a
   * receipt the user had just unlinked.
   *
   * NOT PERSISTED. Reload restores the seed.
   */
  updateReceipt: (receiptId: string, changes: ReceiptEdit) => void
  /**
   * Swap one receipt for another in a single pass — the retake's write. Gate 61.
   *
   * A RETAKE REPLACES THE RECEIPT IT RETAKES (Decision 1, 20 Sept). Gate 60
   * shipped it as an ADD: the user re-shot a receipt the app had told them it
   * could not read, and was left holding two — the original still attached to
   * the transaction and still showing the failed reading, the replacement
   * attached to nothing. They had done exactly what the app asked and the
   * transaction still showed the wrong figures. "Retake" also means replace
   * everywhere else in this category, so the control contradicted its own
   * label. Both are fixed here, and the fix is this mutator.
   *
   * ONE `setReceipts`, NEVER AN `addReceipt` FOLLOWED BY A `deleteReceipt` —
   * the argument `linkReceipt` above already makes. Two writes would render an
   * intermediate frame in which BOTH receipts exist, and when the replacement
   * inherits a link that frame has two receipts claiming one transaction, so
   * `transactionHasReceipt` would answer differently to anything that rendered
   * inside it. One pass makes "a transaction has at most one receipt" true at
   * every observable moment rather than eventually.
   *
   * THE CALLER DECIDES THE LINK, AND IT IS THE CALLER THAT MAKES IT INHERITABLE.
   * This appends the record it is handed, exactly as `addReceipt` does, so a
   * replacement that carries the original's `transactionId` takes the link over
   * and one that carries `null` does not. See `useReceiptRetake` for why the
   * two cases are decided differently, and why auto-match must be SKIPPED
   * rather than merely allowed to return nothing.
   *
   * THE ORIGINAL'S BLOB URL IS REVOKED, on `deleteReceipt`'s reasoning and by
   * the same guard: nothing can show that image again once its record is gone.
   * A seeded receipt carries no `sourceUrl`, so for one of those this only
   * removes — and a seeded receipt can never be retaken anyway, because the
   * advisory that offers a retake cannot fire on a transcribed reading.
   *
   * IT NEVER CALLS `setTransactions`, AND THAT ABSENCE IS THE CONTRACT — the
   * same one `deleteReceipt` and `linkReceipt` document. A link moving from
   * one receipt to another does not authorise this app to move a bank figure,
   * so a replacement whose total differs from the transaction's amount is SHOWN
   * and not reconciled (P6).
   *
   * NO CONFIRMATION ASKS FIRST, AND THAT IS NOT AN OVERSIGHT. P3 confirms what
   * cannot be undone; here the user has explicitly asked to retake THIS
   * receipt, so there is no competing intent to protect, and the precondition
   * for the advisory existing at all is that the original reading produced no
   * line items or no total — there is nothing in it to lose. The picker's
   * Replace confirmation guards a different thing entirely: a link moving
   * between two receipts the user may not have meant to swap. It stays.
   *
   * AUTO-MATCH DOES NOT RE-RUN OVER THE LIBRARY, here or anywhere. It is locked
   * to add time (Gate 50-C).
   *
   * NOT PERSISTED. Reload restores the seed — the replaced receipt included.
   */
  replaceReceipt: (originalId: string, replacement: Receipt) => void
}

/** The three fields `updateReceipt` may change. Nothing else is editable. */
export interface ReceiptEdit {
  merchant: string
  /** Zone-less local wall-clock, `YYYY-MM-DDTHH:mm:ss`. */
  capturedAt: string
  total: Amount
}

const AccountsContext = createContext<AccountsContextValue | null>(null)

export function AccountsProvider({ children }: { children: ReactNode }) {
  // SEEDED FROM THE IMPORT, NOT COPYING IT. `useState`'s initial value is read
  // once per mount, so `TRANSACTIONS` and `RECEIPTS` remain the single authored
  // source and this holds the live version of each.
  // BACKFILLED ONCE, IN THE INITIALISER — Gate 81, `backfillAddedAt`'s shape.
  // The seed predates `Transaction.reference` and the detail sheet's Reference
  // row cannot print without one; see `backfillReferences`.
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    backfillReferences(TRANSACTIONS),
  )
  // BACKFILLED ONCE, IN THE INITIALISER — Gate 58. The seed predates
  // `Receipt.addedAt`, and the Receipts tab orders on it; see `backfillAddedAt`.
  const [receipts, setReceipts] = useState<Receipt[]>(() => backfillAddedAt(RECEIPTS))

  // `useCallback` so the context value's identity is stable across renders that
  // do not change the ledger — without it the memo below rebuilds every render
  // and every consumer re-renders with it.
  const addTransaction = useCallback((transaction: Transaction) => {
    setTransactions((current) => [...current, transaction])
  }, [])

  /**
   * THE CASH ACCOUNTS ARE STATE AS OF GATE 75, and `holdings` below is derived
   * from them in the same change. Splitting those two would have shipped an app
   * whose Homepage balance card moved while its Finance Overview card, net-worth
   * hero and chart did not — see `buildHoldings` for why.
   */
  const [fiatAccounts, setFiatAccounts] = useState<FiatAccount[]>(FIAT_ACCOUNTS)

  const adjustFiatBalance = useCallback((accountId: string, delta: Amount) => {
    setFiatAccounts((current) =>
      current.map((account) =>
        account.id === accountId
          ? { ...account, balance: (toSen(account.balance) + toSen(delta)) / 100 }
          : account,
      ),
    )
  }, [])

  // IMMUTABLE UPDATE, AND THE `map` IS NOT STYLE. Mutating the record in place
  // would leave the array identity unchanged, so the `useMemo` below would not
  // rebuild and no consumer would re-render — the write would land in the data
  // and never reach a pixel. Replacing the one record and the array is what
  // makes the ledger row’s glyph disappear.
  // APPEND, SAME SHAPE AS `addTransaction`. The array identity changes, which
  // is what makes the `useMemo` below rebuild and the Receipts tab re-render —
  // see `unlinkReceipt` for the same point made about mutating in place.
  const addReceipt = useCallback((receipt: Receipt) => {
    setReceipts((current) => [...current, receipt])
  }, [])

  const unlinkReceipt = useCallback((receiptId: string) => {
    setReceipts((current) =>
      current.map((r) => (r.id === receiptId ? { ...r, transactionId: null } : r)),
    )
  }, [])

  // REMOVE, AND REVOKE A CAPTURE'S IN-MEMORY IMAGE. `setTransactions` is not
  // touched, and that absence IS the contract — see `deleteReceipt` above.
  // Revoking inside the updater follows `AddReceiptsModal`'s `remove`; StrictMode
  // may run an updater twice, and revoking an already-revoked url is a no-op.
  const deleteReceipt = useCallback((receiptId: string) => {
    setReceipts((current) => {
      const gone = current.find((r) => r.id === receiptId)
      if (gone?.sourceUrl?.startsWith('blob:')) URL.revokeObjectURL(gone.sourceUrl)
      return current.filter((r) => r.id !== receiptId)
    })
  }, [])

  /*
    LINK, AND SWAP IF THE TARGET IS TAKEN — one `map`, one `setReceipts`.

    THE DISPLACEMENT IS IN THE SAME PASS DELIBERATELY. Unlinking the incumbent
    first and linking second would be two state writes; between them the library
    would hold a frame in which the transaction has no receipt, and — worse —
    `transactionHasReceipt` would answer differently to anything that rendered
    in between. One pass makes "a transaction has at most one receipt" true at
    every observable moment rather than eventually.

    THE ORDER OF THE BRANCHES MATTERS FOR ONE CASE: a receipt already linked to
    this very transaction matches BOTH tests. The first branch wins, so
    re-linking a receipt to the row it already has is a no-op rather than an
    unlink.

    `setTransactions` IS NOT TOUCHED, AND THAT ABSENCE IS THE CONTRACT.
  */
  const linkReceipt = useCallback((receiptId: string, transactionId: string) => {
    setReceipts((current) =>
      current.map((r) => {
        if (r.id === receiptId) return { ...r, transactionId }
        if (r.transactionId === transactionId) return { ...r, transactionId: null }
        return r
      }),
    )
  }, [])

  // THE THREE EDITABLE FIELDS, SPREAD OVER THE RECORD — so `id`, `filename`,
  // `sourceUrl`, `tax`, `lineItems`, `currency` and `transactionId` are
  // provably untouched: they are not in `ReceiptEdit`. `setTransactions` is not
  // touched here either.
  const updateReceipt = useCallback((receiptId: string, changes: ReceiptEdit) => {
    setReceipts((current) =>
      current.map((r) => (r.id === receiptId ? { ...r, ...changes } : r)),
    )
  }, [])

  /*
    REMOVE THE ORIGINAL AND APPEND THE REPLACEMENT — ONE `map`-FREE PASS, ONE
    `setReceipts`. See the contract above for why this is not `addReceipt`
    followed by `deleteReceipt`.

    THE APPEND IS AT THE END, WHICH IS `addReceipt`'s CONTRACT AND NOT AN
    ORDERING DECISION. The Receipts tab sorts on `addedAt` newest-first and
    breaks ties on library order (`receiptsNewestFirst`), so where a record sits
    in this array is never what a screen reads.

    REVOKING INSIDE THE UPDATER FOLLOWS `deleteReceipt`: StrictMode may run an
    updater twice, and revoking an already-revoked url is a no-op. The guard is
    by ID, so the REPLACEMENT's own fresh blob url — created moments earlier and
    about to be rendered — cannot be the one revoked.

    `setTransactions` IS NOT TOUCHED.
  */
  const replaceReceipt = useCallback((originalId: string, replacement: Receipt) => {
    setReceipts((current) => {
      const gone = current.find((r) => r.id === originalId)
      if (gone?.sourceUrl?.startsWith('blob:')) URL.revokeObjectURL(gone.sourceUrl)
      return [...current.filter((r) => r.id !== originalId), replacement]
    })
  }, [])

  /*
    GOALS ARE STATE AND COMMITMENTS ARE NOT — see the two context fields above.

    THE SETTER ARRIVED AT GATE 81 WITH ITS FIRST CALLER, which is the rule that
    kept `addTransaction` from being designed in the abstract: `topUpGoal` below
    credits `savedAmount`. The REST of Flow 11's goal writers — Add, Edit,
    Delete and the auto-save toggle — are Gate 81-B's and are not declared here.
    `Commitment` is still a pass-through constant with no writer at all.
  */
  const [goals, setGoals] = useState<Goal[]>(GOALS)

  /**
   * See the contract on `AccountsContextValue.topUpGoal`.
   *
   * THE GUARDS READ THE ROW AGAINST THE LIVE COLLECTIONS, not against the
   * arguments, because "this goal exists" is a question about state.
   */
  const topUpGoal = useCallback((contribution: Transaction) => {
    const { goalId, accountId, amount } = contribution
    if (!goalId) {
      throw new Error(`topUpGoal: ${contribution.id} carries no goalId`)
    }
    if (contribution.kind !== 'transfer') {
      throw new Error(`topUpGoal: ${contribution.id} is a ${contribution.kind}, not a transfer`)
    }
    if (!(amount < 0)) {
      throw new Error(`topUpGoal: ${contribution.id} must debit its account, got ${amount}`)
    }

    // THE CREDIT IS THE DEBIT'S MAGNITUDE, IN SEN. The row stores what left the
    // account; the goal receives what the row says, so the two cannot drift —
    // and `toSen` is what stops two float additions landing off a two-decimal
    // figure (`adjustFiatBalance`'s reasoning, applied to the other side).
    const credit = -toSen(amount)

    setTransactions((current) => [...current, contribution])
    setFiatAccounts((current) => {
      if (!current.some((a) => a.id === accountId)) {
        throw new Error(`topUpGoal: no cash account ${accountId}`)
      }
      return current.map((account) =>
        account.id === accountId
          ? { ...account, balance: (toSen(account.balance) + toSen(amount)) / 100 }
          : account,
      )
    })
    setGoals((current) => {
      if (!current.some((g) => g.id === goalId)) {
        throw new Error(`topUpGoal: no goal ${goalId}`)
      }
      return current.map((goal) =>
        goal.id === goalId
          ? { ...goal, savedAmount: (toSen(goal.savedAmount) + credit) / 100 }
          : goal,
      )
    })
  }, [])

  /** See `createGoal`. The record arrives whole; this only appends it. */
  const createGoal = useCallback((goal: Goal) => {
    if (goal.savedAmount !== 0) {
      throw new Error(`createGoal: ${goal.id} must start empty, got ${goal.savedAmount}`)
    }
    setFiatAccounts((current) => {
      if (!current.some((a) => a.id === goal.fundingAccountId)) {
        throw new Error(`createGoal: no cash account ${goal.fundingAccountId}`)
      }
      return current
    })
    setGoals((current) => {
      if (current.some((g) => g.id === goal.id)) {
        throw new Error(`createGoal: ${goal.id} already exists`)
      }
      return [...current, goal]
    })
  }, [])

  /** See `updateGoal`. `GoalEdit` cannot name `savedAmount`, so this cannot move money. */
  const updateGoal = useCallback((goalId: string, changes: GoalEdit) => {
    if ((changes.image === undefined) !== (changes.imageOrigin === undefined)) {
      throw new Error(`updateGoal: ${goalId} — image and imageOrigin move together`)
    }
    setGoals((current) => {
      if (!current.some((g) => g.id === goalId)) {
        throw new Error(`updateGoal: no goal ${goalId}`)
      }
      return current.map((goal) => (goal.id === goalId ? { ...goal, ...changes } : goal))
    })
  }, [])

  /**
   * See `deleteGoal`.
   *
   * THE REFUND IS CHECKED AGAINST THE LIVE GOAL, not against its own fields —
   * `topUpGoal`'s rule, and here it is what makes the three-way agreement
   * (goal, account, amount) impossible to get wrong from the outside.
   */
  const deleteGoal = useCallback((goalId: string, refund: Transaction | null) => {
    /*
      ⚠ THE THREE SETTERS ARE SIBLINGS AND NOT NESTED, AND THIS COST A REAL
      DEFECT BEFORE IT WAS WRITTEN DOWN.

      A first version put `setTransactions` and `setFiatAccounts` INSIDE the
      `setGoals` updater, so that all three would land in one batch after the
      guards had passed. A state updater must be PURE, and React 18's
      StrictMode double-invokes it precisely to surface that: the two nested
      setters fired TWICE, the funding account was credited 2 x RM 5,040.00
      against a goals total that fell once, and net worth rose by RM 5,040.00
      on a delete that must not move it at all.

      MEASURED, NOT REASONED: `goal-writers.spec.ts` reported the hero going
      RM 481,038 -> RM 486,078. That assertion exists for exactly this, and it
      is the only one in the suite that could have caught it — every other
      figure on every other screen was correct.

      `topUpGoal` HAS THE RIGHT SHAPE AND IT WAS NOT COPIED CLOSELY ENOUGH:
      three top-level `setX` calls, each updater pure, each validating its own
      atom. React batches them because they are in one event handler, which is
      what makes the write atomic — nesting buys nothing and breaks purity.
    */
    const moves = refund !== null

    setGoals((current) => {
      const goal = current.find((g) => g.id === goalId)
      if (!goal) throw new Error(`deleteGoal: no goal ${goalId}`)
      const held = toSen(goal.savedAmount)

      if (held === 0) {
        if (refund) {
          throw new Error(`deleteGoal: ${goalId} holds nothing, so ${refund.id} returns nothing`)
        }
      } else {
        if (!refund) {
          throw new Error(`deleteGoal: ${goalId} holds ${goal.savedAmount} and must return it`)
        }
        if (refund.goalId !== goalId) {
          throw new Error(`deleteGoal: ${refund.id} carries goalId ${refund.goalId}, not ${goalId}`)
        }
        if (refund.kind !== 'transfer') {
          throw new Error(`deleteGoal: ${refund.id} is a ${refund.kind}, not a transfer`)
        }
        if (refund.accountId !== goal.fundingAccountId) {
          throw new Error(
            `deleteGoal: ${refund.id} credits ${refund.accountId}, not the funding account ${goal.fundingAccountId}`,
          )
        }
        if (toSen(refund.amount) !== held) {
          throw new Error(
            `deleteGoal: ${refund.id} returns ${refund.amount}, not the held ${goal.savedAmount}`,
          )
        }
      }

      return current.filter((g) => g.id !== goalId)
    })

    if (!moves) return

    setTransactions((current) => [...current, refund])
    setFiatAccounts((current) => {
      if (!current.some((a) => a.id === refund.accountId)) {
        throw new Error(`deleteGoal: no cash account ${refund.accountId}`)
      }
      return current.map((account) =>
        account.id === refund.accountId
          ? { ...account, balance: (toSen(account.balance) + toSen(refund.amount)) / 100 }
          : account,
      )
    })
  }, [])

  const value = useMemo<AccountsContextValue>(() => {
    const primaryAccount = fiatAccounts[0]
    if (!primaryAccount) throw new Error('No fiat account seeded')

    // DERIVED FROM THE ACCOUNT STATE, never from the `HOLDINGS` seed. This is
    // the half of the Gate 75 change that keeps every net-worth surface in step
    // with the two bank cards.
    const holdings = buildHoldings(fiatAccounts)

    return {
      fiatAccounts,
      primaryAccount,
      cryptoWallets: CRYPTO_WALLETS,
      cryptoHoldings: CRYPTO_HOLDINGS,
      cryptoTotal: cryptoWalletTotal(CRYPTO_HOLDINGS),
      cryptoChange: cryptoWalletChange(CRYPTO_HOLDINGS),
      transactions,
      holdings,
      /*
        GOAL MONEY COUNTS, AS A SEPARATE TERM. `netWorth` sums the holdings and
        adds `goalsTotal(goals)`; goals are deliberately NOT a `Holding`, so one
        can never be drilled into as a holding or picked as a Top-Up source.

        THE SERIES IS DELIBERATELY NOT GIVEN THE SAME TERM. `netWorthSeries` is
        month-to-date history derived per holding per day, and a goal carries no
        per-day value to derive one from — `savedAmount` is a stored figure whose
        contributions are a partial slice. Adding a flat constant to every point
        would invent history the data does not have. The two were already not
        equal before this gate (the fixed deposit's stored `currentValue` sits
        RM 9.41 above its accrued value on the last day), so the hero figure and
        the chart's last point have never been the same number.
      */
      netWorth: netWorth(holdings, CRYPTO_HOLDINGS, goals),
      netWorthSeries: netWorthSeries(holdings, CRYPTO_HOLDINGS),
      receipts,
      goals,
      commitments: COMMITMENTS,
      commitmentOffers: COMMITMENT_OFFERS,
      addTransaction,
      adjustFiatBalance,
      topUpGoal,
      createGoal,
      updateGoal,
      deleteGoal,
      unlinkReceipt,
      addReceipt,
      deleteReceipt,
      linkReceipt,
      updateReceipt,
      replaceReceipt,
    }
  }, [
    fiatAccounts,
    transactions,
    receipts,
    goals,
    addTransaction,
    adjustFiatBalance,
    topUpGoal,
    createGoal,
    updateGoal,
    deleteGoal,
    unlinkReceipt,
    addReceipt,
    deleteReceipt,
    linkReceipt,
    updateReceipt,
    replaceReceipt,
  ])

  return (
    <AccountsContext.Provider value={value}>{children}</AccountsContext.Provider>
  )
}

export function useAccounts(): AccountsContextValue {
  const ctx = useContext(AccountsContext)
  if (!ctx) throw new Error('useAccounts must be used inside an AccountsProvider')
  return ctx
}

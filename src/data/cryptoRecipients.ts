import type { CryptoRecipient } from './types'

/**
 * Flow 5 (Gate 96). Figma `1266:14395`, in Figma's order. A constant (R92-5, R96-4):
 * not stored, and outside `seedFingerprint`, so adding it resets no tester.
 *
 * THE ADDRESSES ARE COMPLETED, NOT INVENTED WHOLESALE. Figma prints only the two
 * ends (`0x92fa...1ae3`), and both ends are valid hex, so each address keeps the
 * drawn first four and last four hex digits and fills the 32 between them with the
 * first 32 hex digits of SHA-256 of the contact's name — deterministic, and fixed
 * here as literals so nothing computes an address at runtime. Well-formed hex
 * (inventory A7); `crypto-transfer.spec.ts` asserts the shape and the drawn ends.
 *
 * Rachum Greene shares `rachum-greene.jpg` with her bank record in `recipients.ts`.
 */
export const CRYPTO_RECIPIENTS: CryptoRecipient[] = [
  { id: 'crypto-granddaughter', name: 'Granddaughter', addresses: { bitcoin: 'bc1qd6e7gu452hsget7d5x7z0fme9dyp9y80uv0e86', solana: 'GRotpCNpgwKZuZfsFFWwCB89hA8UWz9QhTrQbHrYRUSK', stellar: 'GBBVGYUJAUGQNVMZT6Z2Z4UB25GDNYZEU3QHY4N3GRUD4NMTUFIBQV7H' }, address: '0x92fa38955860b4b8c41590f630b9ce5881981ae3', mark: { kind: 'image', filename: 'granddaughter.jpg' } },
  { id: 'crypto-grandson', name: 'Grandson', addresses: { bitcoin: 'bc1q7v6ag030h0xaj0m0amy5x9q2w4tf36q7eqcx43', solana: 'Ds7nFotUBedekXwoQPSnkzeXASDXzvGXDKX5P218xvh5', stellar: 'GAHVJQIB36T5ZFZ6YL4YG2HRAJ4NQF4CP7VUI5VYFDMGMWSF43YRQD27' }, address: '0xb7c2b3d95e402c912dfc6028a6cdca10acc849ff', mark: { kind: 'image', filename: 'grandson.jpg' } },
  { id: 'crypto-rachum-greene', name: 'Rachum Greene', addresses: { bitcoin: 'bc1qvgxcn72e4v6qy2zaw66wxndht23jzj047q29zy', solana: 'Ceny4S4sv25o3dteFj7UnoTYBP3bkr3arxjnVM9pJza5', stellar: 'GBFCJFKAKNAQ2C5G7U2G3N34R54PHIR44QNZ3CIOJ7PRB2S7JQ36K5CQ' }, address: '0xa53bf9898943df377128d26a1d98e2582e7cd92c', mark: { kind: 'image', filename: 'rachum-greene.jpg' } },
  { id: 'crypto-jonathan-llango', name: 'Jonathan Llango', addresses: { bitcoin: 'bc1qy7udx98kat0ykgh8t35ka6tjpwvpt82r2sv6mp', solana: 'BMoE3SDv5jPXDyoNoT7NMJsoB7YGcsFLJ5P96ZUrLtLm', stellar: 'GD2HBPZEKIO5TUKQZU3MNIQI5L2GTU3TLQQDSWIIHIKWTPJUHD6NNTBT' }, address: '0x7ee8df0700be9231b2f535dd36cd6e15c085f391', mark: { kind: 'image', filename: 'jonathan-llango.jpg' } },
  { id: 'crypto-tobey-jibriani', name: 'Tobey Jibriani', addresses: { bitcoin: 'bc1qzl0zsylf8vwgcfzgneq36ga5794vx2xrtzh25m', solana: 'DECNE9YbkNbDdUEE2o62yRKbmLRDHwWxmAMwkY7kG9DP', stellar: 'GBTY75LQ2Z345DRKWOXEEBTD47N7Y7GSVMJ43PK662QBWO3RBGP7SQ6W' }, address: '0xc19ef327ad7809deaf330f504951f030ac1f71ad', mark: { kind: 'image', filename: 'tobey-jibriani.jpg' } },
]

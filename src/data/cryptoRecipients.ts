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
  { id: 'crypto-granddaughter', name: 'Granddaughter', address: '0x92fa38955860b4b8c41590f630b9ce5881981ae3', mark: { kind: 'image', filename: 'granddaughter.jpg' } },
  { id: 'crypto-grandson', name: 'Grandson', address: '0xb7c2b3d95e402c912dfc6028a6cdca10acc849ff', mark: { kind: 'image', filename: 'grandson.jpg' } },
  { id: 'crypto-rachum-greene', name: 'Rachum Greene', address: '0xa53bf9898943df377128d26a1d98e2582e7cd92c', mark: { kind: 'image', filename: 'rachum-greene.jpg' } },
  { id: 'crypto-jonathan-llango', name: 'Jonathan Llango', address: '0x7ee8df0700be9231b2f535dd36cd6e15c085f391', mark: { kind: 'image', filename: 'jonathan-llango.jpg' } },
  { id: 'crypto-tobey-jibriani', name: 'Tobey Jibriani', address: '0xc19ef327ad7809deaf330f504951f030ac1f71ad', mark: { kind: 'image', filename: 'tobey-jibriani.jpg' } },
]

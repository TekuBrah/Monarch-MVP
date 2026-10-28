import type { Recipient } from './types'

/** Flow 4 (Gate 92). Figma `1266:14391`, in Figma's order. A constant (R92-5). */
export const RECIPIENTS: Recipient[] = [
  { id: 'recipient-aeon-big', name: 'Aeon Big', kind: 'business', accountNo: '6542645894', bankCode: 'MBB', mark: { kind: 'merchant', name: 'aeon' } },
  { id: 'recipient-caring-pharmacy', name: 'Caring Pharmacy', kind: 'business', accountNo: '6790354865', bankCode: 'PBB', mark: { kind: 'merchant', name: 'caring' } },
  { id: 'recipient-rachum-greene', name: 'Rachum Greene', kind: 'person', accountNo: '4597623547', bankCode: 'CIMB', mark: { kind: 'image', filename: 'rachum-greene.jpg' } },
  { id: 'recipient-perry-matthew', name: 'Perry Matthew', kind: 'person', accountNo: '5134650975', bankCode: 'RHB', mark: { kind: 'image', filename: 'perry-matthew.jpg' } },
  { id: 'recipient-fiona-hammock', name: 'Fiona Hammock', kind: 'person', accountNo: '2731640973', bankCode: 'HLB', mark: { kind: 'image', filename: 'fiona-hammock.jpg' } },
]

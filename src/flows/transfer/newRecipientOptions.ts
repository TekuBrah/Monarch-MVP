/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE CHOICES THE NEW-RECIPIENT FORM OFFERS — Gate 101 (Flow 6).
 *
 * `available: false` RAISES "Coming soon." (R100-4's rule, applied to every
 * list): the option is listed because a real bank app lists it, and it does not
 * continue because nothing in this app could honour it.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export interface FormOption {
  id: string
  label: string
  available: boolean
}

/**
 * SELECT TRANSFER TYPE — Figma `1266:14385`, all seven as drawn and in the
 * drawn order (R100-4). Only Account Number has a drawn path.
 */
export const TRANSFER_TO_OPTIONS: FormOption[] = [
  { id: 'account-number', label: 'Account Number', available: true },
  { id: 'mobile-number', label: 'Mobile Number', available: false },
  { id: 'ic-number', label: 'IC Number', available: false },
  { id: 'army-id', label: 'Army Identification Number', available: false },
  { id: 'police-id', label: 'Police Identification Number', available: false },
  { id: 'passport-number', label: 'Passport Number', available: false },
  { id: 'business-registration', label: 'Business registration Number', available: false },
]

/**
 * ACCOUNT TYPE — undrawn list; Figma draws only the value "Current/Savings".
 * Malaysian interbank transfers reach four account kinds — savings, current,
 * credit card and loan/financing (ABM's IBG FAQ; HSBC Malaysia's IBG page) —
 * and the drawn value names the first two as one choice. Only it continues: a
 * card or loan payment is a different flow nothing here builds.
 */
export const ACCOUNT_TYPE_OPTIONS: FormOption[] = [
  { id: 'current-savings', label: 'Current/Savings', available: true },
  { id: 'credit-card', label: 'Credit Card', available: false },
  { id: 'loan-financing', label: 'Loan/Financing', available: false },
]

/**
 * TRANSFER TYPE — undrawn list; Figma draws "DuitNow". The other Malaysian
 * interbank rail is Interbank GIRO (IBG), credited by the next business day. The
 * app's send is instant by construction, so offering IBG as working would
 * describe a timing nothing honours.
 */
export const TRANSFER_TYPE_OPTIONS: FormOption[] = [
  { id: 'duitnow', label: 'DuitNow', available: true },
  { id: 'ibg', label: 'Interbank GIRO (IBG)', available: false },
]

/**
 * RECIPIENT REFERENCE — undrawn list; Figma draws it as a `Select` reading
 * "Fund Transfer". Real apps take free text here (mandatory, 40–140 characters
 * by bank); the drawing makes it a choice, so it is a short list of common
 * purposes and free text goes in Other Payment Details. A recorded divergence.
 */
export const REFERENCE_OPTIONS: FormOption[] = [
  { id: 'fund-transfer', label: 'Fund Transfer', available: true },
  { id: 'family-support', label: 'Family Support', available: true },
  { id: 'rent', label: 'Rent', available: true },
  { id: 'bill-payment', label: 'Bill Payment', available: true },
  { id: 'loan-repayment', label: 'Loan Repayment', available: true },
  { id: 'gift', label: 'Gift', available: true },
]

/** Other Payment Details' cap — Standard Chartered Malaysia's DuitNow reference limit. */
export const OTHER_DETAILS_MAX = 40

export function optionLabel(options: readonly FormOption[], id: string): string {
  return options.find((o) => o.id === id)?.label ?? id
}

import type { Bank } from './types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE BANKS A NEW RECIPIENT CAN BE AT — Gate 101 (Flow 6), Figma `1266:14386`.
 *
 * A CONSTANT, NEVER STORED, OUTSIDE THE SEED FINGERPRINT (as `RECIPIENTS`,
 * R92-5). One entry per BANKING GROUP: a group's Islamic arm shares its bank
 * code ("Conventional & Islamic arm is sharing the same bank code", the source
 * below), and Figma's list draws no Islamic arms either.
 *
 * SOURCE: UOB Malaysia, "IBG & DuitNow Participating Bank code & account
 * length" — https://uob.com.my/assets/web-resources/business/pdf/ibg-duitnow-participating-bank.pdf
 * (read 9 Nov 2026; undated). Its bank rows 1–35, 41 and 43. Its e-wallet rows
 * (Touch 'n Go, Boost eWallet, ShopeePay, BigPay and the rest) are not banks and
 * are left out — the screen is "Select recipient bank".
 *
 * `bic` IS THE TABLE'S "DuitNow Bank code". Bangkok Bank has none there (an IBG
 * code only); it stays in the list because Figma draws it, and it is recorded.
 *
 * `code` IS THE SHORT CODE THE APP PRINTS after an account number —
 * "6451352078 • AFFIN" (`1266:14388`). The five codes the seeded recipients
 * already carry (MBB, PBB, CIMB, RHB, HLB) are kept exactly.
 *
 * NAMES: Figma's drawn A and B entries appear as drawn, with its casing slips
 * corrected and recorded: "AL-RaJhi" -> "Al Rajhi", "Ambank/Amfinance" ->
 * "AmBank/AmFinance", "Bank Of America" / "Bank Of China" -> "of". Sorted
 * case-insensitively, so Bank Muamalat (a participant Figma does not draw) sits
 * between Bank Kerjasama and Bank of America — a recorded divergence.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const BANKS: Bank[] = [
  { code: 'AEON', name: 'Aeon Bank', bic: 'ACDBMYK2' },
  { code: 'AFFIN', name: 'Affin Bank', bic: 'PHBMMYKL' },
  { code: 'AGRO', name: 'Agrobank', bic: 'AGOBMYKL' },
  { code: 'ALRAJHI', name: 'Al Rajhi Banking & Investment Corp', bic: 'RJHIMYKL' },
  { code: 'ALLIANCE', name: 'Alliance Bank Malaysia Berhad', bic: 'MFBBMYKL' },
  { code: 'AMBANK', name: 'AmBank/AmFinance Berhad', bic: 'ARBKMYKL' },
  { code: 'BANGKOK', name: 'Bangkok Bank Berhad', bic: null },
  { code: 'BIMB', name: 'Bank Islam Malaysia Berhad', bic: 'BIMBMYKL' },
  { code: 'BKRM', name: 'Bank Kerjasama Rakyat Malaysia', bic: 'BKRMMYKL' },
  { code: 'MUAMALAT', name: 'Bank Muamalat Malaysia Berhad', bic: 'BMMBMYKL' },
  { code: 'BOFA', name: 'Bank of America', bic: 'BOFAMY2X' },
  { code: 'BOC', name: 'Bank of China', bic: 'BKCHMYKL' },
  { code: 'BSN', name: 'Bank Simpanan Nasional', bic: 'BSNAMYK1' },
  { code: 'BNP', name: 'BNP Paribas Malaysia Berhad', bic: 'BNPAMYKL' },
  { code: 'BOOST', name: 'Boost Bank', bic: 'BOBEMYK2' },
  { code: 'CCB', name: 'China Construction Bank (Malaysia) Berhad', bic: 'PCBCMYKL' },
  { code: 'CIMB', name: 'CIMB Bank', bic: 'CIBBMYKL' },
  { code: 'CITI', name: 'Citibank', bic: 'CITIMYKL' },
  { code: 'DB', name: 'Deutsche Bank (Malaysia) Berhad', bic: 'DEUTMYKL' },
  { code: 'GX', name: 'GXBank', bic: 'GXSPMYKL' },
  { code: 'HLB', name: 'Hong Leong Bank', bic: 'HLBBMYKL' },
  { code: 'HSBC', name: 'HSBC Bank Malaysia Berhad', bic: 'HBMBMYKL' },
  { code: 'ICBC', name: 'Industrial and Commercial Bank of China (Malaysia) Berhad', bic: 'ICBKMYKL' },
  { code: 'JPM', name: 'J.P. Morgan Chase Bank Berhad', bic: 'CHASMYKX' },
  { code: 'KAF', name: 'KAF Digital Bank', bic: 'KAFBMYK2' },
  { code: 'KFH', name: 'Kuwait Finance House (Malaysia) Berhad', bic: 'KFHOMYKL' },
  { code: 'MBB', name: 'Maybank', bic: 'MBBEMYKL' },
  { code: 'MBSB', name: 'MBSB Bank Berhad', bic: 'AFBQMYKL' },
  { code: 'MIZUHO', name: 'Mizuho Bank (Malaysia) Berhad', bic: 'MHCBMYKA' },
  { code: 'MUFG', name: 'MUFG Bank (Malaysia) Berhad', bic: 'BOTKMYKX' },
  { code: 'OCBC', name: 'OCBC Bank (Malaysia) Berhad', bic: 'OCBCMYKL' },
  { code: 'PBB', name: 'Public Bank', bic: 'PBBEMYKL' },
  { code: 'RHB', name: 'RHB Bank', bic: 'RHBBMYKL' },
  { code: 'RYT', name: 'Ryt Bank', bic: 'SCCHMYKL' },
  { code: 'SCB', name: 'Standard Chartered Bank Malaysia Berhad', bic: 'SCBLMYKX' },
  { code: 'SMBC', name: 'Sumitomo Mitsui Banking Corporation Malaysia Berhad', bic: 'SMBCMYKL' },
  { code: 'UOB', name: 'United Overseas Bank (Malaysia) Bhd', bic: 'UOVBMYKL' },
]

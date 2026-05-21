import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js'

export interface NormalizedPhone {
  raw: string
  e164: string | null
  valid: boolean
}

export function normalizePhone(input: string, region: CountryCode = 'MY'): NormalizedPhone {
  const raw = (input ?? '').trim()
  if (!raw) return { raw, e164: null, valid: false }

  const digits = raw.replace(/[^\d+]/g, '')
  let candidate = digits
  if (!digits.startsWith('+')) {
    candidate = digits.startsWith('60') ? `+${digits}` : digits
  }

  const parsed = parsePhoneNumberFromString(candidate, region)
  if (parsed && parsed.isValid()) {
    return { raw, e164: parsed.number, valid: true }
  }
  return { raw, e164: null, valid: false }
}

export function dedupeKey(p: NormalizedPhone): string {
  return p.e164 ?? p.raw.replace(/[^\d]/g, '')
}

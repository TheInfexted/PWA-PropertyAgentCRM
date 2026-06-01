export type FollowUpState = 'overdue' | 'today' | 'upcoming'

/** Compare a follow-up ISO datetime to `now` by UTC calendar day. null if no/invalid date. */
export function followUpState(iso: string | null, now: Date = new Date()): FollowUpState | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const day = (x: Date) => Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate())
  const a = day(d)
  const b = day(now)
  if (a < b) return 'overdue'
  if (a === b) return 'today'
  return 'upcoming'
}

/** 'YYYY-MM-DD' -> ISO datetime at UTC midnight. '' -> null. */
export function dateInputToIso(date: string): string | null {
  if (!date) return null
  return `${date}T00:00:00.000Z`
}

/** ISO datetime -> 'YYYY-MM-DD' for an <input type="date">. null/invalid -> ''. */
export function isoToDateInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

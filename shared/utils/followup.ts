export type FollowUpState = 'overdue' | 'today' | 'upcoming'

/** Today's calendar date as 'YYYY-MM-DD' in the LOCAL timezone. */
export function todayStr(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Compare a 'YYYY-MM-DD' follow-up date to today (local). null if no date. */
export function followUpState(date: string | null, now: Date = new Date()): FollowUpState | null {
  if (!date) return null
  const today = todayStr(now)
  if (date < today) return 'overdue'
  if (date === today) return 'today'
  return 'upcoming'
}

/** '<input type=date>' value -> stored value. '' -> null. */
export function dateInputToStored(date: string): string | null {
  return date || null
}

/** Stored value -> '<input type=date>' value. Tolerates legacy ISO; null/'' -> ''. */
export function storedToDateInput(value: string | null): string {
  if (!value) return ''
  return value.length > 10 ? value.slice(0, 10) : value
}

import type { OptionalFieldKey } from '~~/shared/types'

export interface OptionalFieldSource {
  email?: string | null
  intent?: string | null
  propertyType?: string | null
  budgetMin?: number | null
  budgetMax?: number | null
  tags?: string[] | null
}

export function formatBudget(min?: number | null, max?: number | null): string {
  const f = (n: number) => n.toLocaleString('en-US')
  if (min == null && max == null) return ''
  if (min != null && max != null) return `${f(min)}–${f(max)}`
  if (min != null) return `≥ ${f(min)}`
  return `≤ ${f(max as number)}`
}

export function optionalFieldDisplay(row: OptionalFieldSource, key: OptionalFieldKey): string {
  switch (key) {
    case 'email': return row.email ?? ''
    case 'intent': return row.intent ?? ''
    case 'propertyType': return row.propertyType ?? ''
    case 'budget': return formatBudget(row.budgetMin, row.budgetMax)
    case 'tags': return (row.tags ?? []).join(', ')
  }
}

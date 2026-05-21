export interface StatusRow {
  id: number
  label: string
  color: string
  sortOrder: number
}

export function useStatuses() {
  const statuses = useState<StatusRow[]>('statuses', () => [])
  async function load() {
    statuses.value = await $fetch<StatusRow[]>('/api/statuses')
    return statuses.value
  }
  function byId(id: number | null | undefined) {
    return id ? statuses.value.find((s) => s.id === id) ?? null : null
  }
  return { statuses, load, byId }
}

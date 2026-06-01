export interface StatusRow {
  id: number
  label: string
  color: string
  sortOrder: number
}

export function useStatuses() {
  const statuses = useState<StatusRow[]>('statuses', () => [])
  // useRequestFetch forwards the request cookies during SSR (plain $fetch does not),
  // so authenticated calls work on a full page load, not just client navigation.
  const request = useRequestFetch()
  async function load() {
    statuses.value = await request<StatusRow[]>('/api/statuses')
    return statuses.value
  }
  function byId(id: number | null | undefined) {
    return id ? statuses.value.find((s) => s.id === id) ?? null : null
  }
  return { statuses, load, byId }
}

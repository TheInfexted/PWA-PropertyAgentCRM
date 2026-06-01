import type { LeadInput } from '~~/shared/schemas/lead'

export interface LeadsQuery {
  page: number
  pageSize: number
  statusId?: number
  assignedTo?: number
  area?: string
  search?: string
  sort?: 'name' | 'createdAt' | 'area'
  dir?: 'asc' | 'desc'
}

/** Pure: strips undefined/empty values so the URL stays clean. */
export function buildLeadsQuery(q: LeadsQuery): Record<string, string | number> {
  const out: Record<string, string | number> = { page: q.page, pageSize: q.pageSize }
  if (q.statusId) out.statusId = q.statusId
  if (q.assignedTo) out.assignedTo = q.assignedTo
  if (q.area) out.area = q.area
  if (q.search) out.search = q.search
  if (q.sort) out.sort = q.sort
  if (q.dir) out.dir = q.dir
  return out
}

export function useLeads() {
  // useRequestFetch forwards the request cookies during SSR (plain $fetch does not),
  // so the leads list loads on a full page render, not just after client navigation.
  const request = useRequestFetch()
  async function list(q: LeadsQuery) {
    return request('/api/leads', { query: buildLeadsQuery(q) })
  }
  async function create(data: LeadInput) {
    return request('/api/leads', { method: 'POST', body: data })
  }
  async function update(id: number, data: Partial<LeadInput>) {
    return request(`/api/leads/${id}`, { method: 'PATCH', body: data })
  }
  async function remove(id: number) {
    return request(`/api/leads/${id}`, { method: 'DELETE' })
  }
  return { list, create, update, remove }
}

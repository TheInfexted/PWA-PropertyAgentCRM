import { listLeads } from '~~/server/utils/leads.repo'

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  const q = getQuery(event)
  const num = (v: unknown) => (v === undefined || v === '' ? undefined : Number(v))
  return listLeads(ctx, {
    page: num(q.page), pageSize: num(q.pageSize),
    statusId: num(q.statusId), assignedTo: num(q.assignedTo),
    area: (q.area as string) || undefined,
    search: (q.search as string) || undefined,
    sort: (q.sort as 'name' | 'createdAt' | 'area') || 'createdAt',
    dir: (q.dir as 'asc' | 'desc') || 'desc',
  })
})

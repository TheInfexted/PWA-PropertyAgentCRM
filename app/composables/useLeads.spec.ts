import { describe, it, expect } from 'vitest'
import { buildLeadsQuery } from './useLeads'

describe('buildLeadsQuery', () => {
  it('always includes page and pageSize', () => {
    expect(buildLeadsQuery({ page: 2, pageSize: 50 })).toEqual({ page: 2, pageSize: 50 })
  })
  it('includes optional filters only when set', () => {
    const q = buildLeadsQuery({
      page: 1, pageSize: 50, statusId: 3, assignedTo: 7,
      area: 'PJ', search: 'sam', sort: 'name', dir: 'asc', dueOnly: true,
    })
    expect(q).toEqual({ page: 1, pageSize: 50, statusId: 3, assignedTo: 7, area: 'PJ', search: 'sam', sort: 'name', dir: 'asc', due: 1 })
  })
  it('omits dueOnly when false/undefined', () => {
    expect(buildLeadsQuery({ page: 1, pageSize: 50, dueOnly: false }).due).toBeUndefined()
    expect(buildLeadsQuery({ page: 1, pageSize: 50 }).due).toBeUndefined()
  })
})

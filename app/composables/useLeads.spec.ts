import { describe, it, expect } from 'vitest'
import { buildLeadsQuery } from './useLeads'

describe('buildLeadsQuery', () => {
  it('omits empty filters', () => {
    expect(buildLeadsQuery({ page: 1, pageSize: 50 })).toEqual({ page: 1, pageSize: 50 })
  })
  it('includes set filters', () => {
    expect(buildLeadsQuery({ page: 2, pageSize: 50, statusId: 3, search: 'dean' }))
      .toEqual({ page: 2, pageSize: 50, statusId: 3, search: 'dean' })
  })
})

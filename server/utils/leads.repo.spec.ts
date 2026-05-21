import { describe, it, expect } from 'vitest'
import { buildLeadWhereParts } from './leads.repo'

describe('buildLeadWhereParts', () => {
  it('owner filters by workspace only', () => {
    const parts = buildLeadWhereParts({ workspaceId: 7, role: 'owner', userId: 1 }, {})
    expect(parts).toEqual([{ col: 'workspaceId', value: 7 }])
  })
  it('agent adds an assignedTo filter', () => {
    const parts = buildLeadWhereParts({ workspaceId: 7, role: 'agent', userId: 3 }, {})
    expect(parts).toContainEqual({ col: 'workspaceId', value: 7 })
    expect(parts).toContainEqual({ col: 'assignedTo', value: 3 })
  })
  it('applies a status filter when provided', () => {
    const parts = buildLeadWhereParts({ workspaceId: 7, role: 'owner', userId: 1 }, { statusId: 5 })
    expect(parts).toContainEqual({ col: 'statusId', value: 5 })
  })
})

import { describe, it, expect } from 'vitest'
import { leadVisibilityScope } from './visibility'

describe('leadVisibilityScope', () => {
  it('owner sees the whole workspace', () => {
    expect(leadVisibilityScope({ workspaceId: 7, role: 'owner', userId: 1 }))
      .toEqual({ workspaceId: 7 })
  })
  it('agent is restricted to their own assigned leads', () => {
    expect(leadVisibilityScope({ workspaceId: 7, role: 'agent', userId: 3 }))
      .toEqual({ workspaceId: 7, assignedTo: 3 })
  })
})

import { describe, it, expect } from 'vitest'
import { buildSessionPayload } from './session-payload'

describe('buildSessionPayload', () => {
  it('packs user, workspace and role for the cookie', () => {
    const p = buildSessionPayload(
      { id: 5, email: 'a@b.com', name: 'Ana' },
      { workspaceId: 2, role: 'owner' },
    )
    expect(p).toEqual({
      user: { id: 5, email: 'a@b.com', name: 'Ana' },
      workspaceId: 2,
      role: 'owner',
    })
  })
})

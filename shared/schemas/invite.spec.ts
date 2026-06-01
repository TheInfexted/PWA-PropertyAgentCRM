import { describe, it, expect } from 'vitest'
import { createInviteSchema, acceptInviteSchema, inviteLink } from './invite'

describe('createInviteSchema', () => {
  it('accepts an email and defaults role to agent', () => {
    const r = createInviteSchema.safeParse({ email: 'sam@kirana.my' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.role).toBe('agent')
  })
  it('rejects a bad email', () => {
    expect(createInviteSchema.safeParse({ email: 'nope' }).success).toBe(false)
  })
})

describe('acceptInviteSchema', () => {
  it('requires token, name and an 8+ char password', () => {
    expect(acceptInviteSchema.safeParse({ token: 'abcdef1234', name: 'Sam', password: 'hunter22' }).success).toBe(true)
    expect(acceptInviteSchema.safeParse({ token: 'abcdef1234', name: 'Sam', password: 'short' }).success).toBe(false)
  })
})

describe('inviteLink', () => {
  it('builds the accept URL from an origin and token', () => {
    expect(inviteLink('https://crm-demo.ninedsales.com', 'tok123')).toBe('https://crm-demo.ninedsales.com/invite/tok123')
  })
  it('trims a trailing slash on the origin', () => {
    expect(inviteLink('https://x.com/', 'tok')).toBe('https://x.com/invite/tok')
  })
})

import { describe, it, expect } from 'vitest'
import { memberRoleSchema, memberPasswordSchema } from './member'

describe('memberRoleSchema', () => {
  it('accepts owner/agent', () => {
    expect(memberRoleSchema.safeParse({ role: 'owner' }).success).toBe(true)
    expect(memberRoleSchema.safeParse({ role: 'agent' }).success).toBe(true)
  })
  it('rejects an unknown role', () => {
    expect(memberRoleSchema.safeParse({ role: 'admin' }).success).toBe(false)
  })
})

describe('memberPasswordSchema', () => {
  it('requires an 8+ char password', () => {
    expect(memberPasswordSchema.safeParse({ newPassword: 'hunter22' }).success).toBe(true)
    expect(memberPasswordSchema.safeParse({ newPassword: 'short' }).success).toBe(false)
  })
})

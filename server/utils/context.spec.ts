import { describe, it, expect } from 'vitest'
// Nitro auto-imports `createError` at runtime; stub it for this unit test.
;(globalThis as unknown as { createError: (e: { statusCode?: number; message?: string }) => Error }).createError =
  (e) => Object.assign(new Error(e?.message ?? 'error'), e)
import { contextFromSession } from './context'

describe('contextFromSession', () => {
  it('extracts userId, workspaceId and role', () => {
    const ctx = contextFromSession({
      user: { id: 9, email: 'x@y.com', name: 'X' }, workspaceId: 4, role: 'agent',
    })
    expect(ctx).toEqual({ userId: 9, workspaceId: 4, role: 'agent' })
  })
  it('throws when the session has no workspace', () => {
    expect(() => contextFromSession({ user: { id: 9, email: 'x@y.com', name: 'X' } } as never))
      .toThrowError()
  })
})

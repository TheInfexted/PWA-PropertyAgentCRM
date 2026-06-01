import { describe, it, expect } from 'vitest'
import { workspaceSettingsSchema, workspacePatchSchema } from './workspace'

describe('workspaceSettingsSchema', () => {
  it('accepts known optional-field keys and areas', () => {
    expect(workspaceSettingsSchema.safeParse({ enabledOptionalFields: ['email', 'budget'], areas: ['PJ', 'KL'] }).success).toBe(true)
  })
  it('rejects an unknown optional-field key', () => {
    expect(workspaceSettingsSchema.safeParse({ enabledOptionalFields: ['nope'], areas: [] }).success).toBe(false)
  })
  it('rejects a blank area', () => {
    expect(workspaceSettingsSchema.safeParse({ enabledOptionalFields: [], areas: [''] }).success).toBe(false)
  })
})

describe('workspacePatchSchema', () => {
  it('accepts a name-only patch', () => {
    expect(workspacePatchSchema.safeParse({ name: 'Kirana' }).success).toBe(true)
  })
  it('accepts a settings-only patch', () => {
    expect(workspacePatchSchema.safeParse({ settings: { enabledOptionalFields: [], areas: [] } }).success).toBe(true)
  })
  it('rejects an empty patch', () => {
    expect(workspacePatchSchema.safeParse({}).success).toBe(false)
  })
})

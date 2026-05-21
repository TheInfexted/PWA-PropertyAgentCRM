import { describe, it, expect } from 'vitest'
import { getTableConfig } from 'drizzle-orm/mysql-core'
import { leads, users, workspaces, workspaceMembers, statuses, activities } from './schema'

describe('db schema', () => {
  it('defines all core tables', () => {
    expect(getTableConfig(users).name).toBe('users')
    expect(getTableConfig(workspaces).name).toBe('workspaces')
    expect(getTableConfig(workspaceMembers).name).toBe('workspace_members')
    expect(getTableConfig(statuses).name).toBe('statuses')
    expect(getTableConfig(leads).name).toBe('leads')
    expect(getTableConfig(activities).name).toBe('activities')
  })

  it('leads table carries the call-list core columns', () => {
    const cols = getTableConfig(leads).columns.map((c) => c.name)
    for (const c of ['name', 'phone_e164', 'phone_raw', 'area', 'status_id', 'remarks', 'assigned_to', 'next_follow_up_at']) {
      expect(cols).toContain(c)
    }
  })
})

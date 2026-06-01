import { describe, it, expect } from 'vitest'
import { DEFAULT_STATUS_LABELS } from './defaults'

describe('default statuses', () => {
  it('starts with the friend\'s call-list statuses', () => {
    expect(DEFAULT_STATUS_LABELS[0]).toBe('New')
    expect(DEFAULT_STATUS_LABELS).toContain('No Answer')
    expect(DEFAULT_STATUS_LABELS).toContain('Callback')
    expect(DEFAULT_STATUS_LABELS).toContain('Closed - Won')
  })
})

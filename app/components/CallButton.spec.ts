// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import CallButton from './CallButton.vue'

// CallButton relies on Nuxt auto-imports (useLeads, ref) that aren't injected by the
// plain vue test plugin, so stub them on globalThis before the component mounts.
beforeAll(() => {
  ;(globalThis as Record<string, unknown>).ref = ref
  ;(globalThis as Record<string, unknown>).useLeads = () => ({ logCall: vi.fn() })
})

describe('CallButton', () => {
  it('renders a tel: link to the e164 number', () => {
    const w = mount(CallButton, { props: { e164: '+60128975215' } })
    expect(w.get('a').attributes('href')).toBe('tel:+60128975215')
  })
  it('is disabled when there is no valid number', () => {
    const w = mount(CallButton, { props: { e164: null } })
    expect(w.find('a').exists()).toBe(false)
  })
})

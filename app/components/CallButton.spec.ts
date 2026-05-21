// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CallButton from './CallButton.vue'

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

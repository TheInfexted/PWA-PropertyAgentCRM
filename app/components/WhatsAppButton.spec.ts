// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import WhatsAppButton from './WhatsAppButton.vue'

describe('WhatsAppButton', () => {
  it('links to wa.me with digits only', () => {
    const w = mount(WhatsAppButton, { props: { e164: '+60128975215' } })
    expect(w.get('a').attributes('href')).toBe('https://wa.me/60128975215')
  })
})

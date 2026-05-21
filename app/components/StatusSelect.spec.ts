// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusSelect from './StatusSelect.vue'

const statuses = [
  { id: 1, label: 'New', color: '#6b7280', sortOrder: 0 },
  { id: 2, label: 'Callback', color: '#a16207', sortOrder: 1 },
]

describe('StatusSelect', () => {
  it('emits the chosen status id', async () => {
    const w = mount(StatusSelect, { props: { modelValue: 1, statuses } })
    await w.get('select').setValue('2')
    expect(w.emitted('update:modelValue')?.[0]).toEqual([2])
  })
})

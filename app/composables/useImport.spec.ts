import { describe, it, expect } from 'vitest'
import { splitHeaderAndBody } from './useImport'

describe('splitHeaderAndBody', () => {
  it('treats the first row as a header when hasHeader is true', () => {
    const grid = [['Name', 'Phone'], ['Dean', '60128975215']]
    expect(splitHeaderAndBody(grid, true)).toEqual({
      header: ['Name', 'Phone'],
      body: [['Dean', '60128975215']],
    })
  })
  it('synthesizes Column N headers when hasHeader is false', () => {
    const grid = [['Dean', '60128975215']]
    expect(splitHeaderAndBody(grid, false)).toEqual({
      header: ['Column 1', 'Column 2'],
      body: [['Dean', '60128975215']],
    })
  })
  it('handles an empty grid', () => {
    expect(splitHeaderAndBody([], true)).toEqual({ header: [], body: [] })
  })
})

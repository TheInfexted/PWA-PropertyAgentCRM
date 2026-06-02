import { describe, it, expect } from 'vitest'
import { parseDelimited, autoMapColumns, dupeKey, markInBatchDupes } from './import'

describe('parseDelimited', () => {
  it('parses tab-separated rows (spreadsheet paste)', () => {
    expect(parseDelimited('Name\tContact\nDean Cheong\t60128975215'))
      .toEqual([['Name', 'Contact'], ['Dean Cheong', '60128975215']])
  })
  it('parses CSV and respects quoted commas', () => {
    expect(parseDelimited('Name,Area\nDean,"Petaling, Jaya"'))
      .toEqual([['Name', 'Area'], ['Dean', 'Petaling, Jaya']])
  })
  it('unescapes doubled quotes inside a quoted field', () => {
    expect(parseDelimited('a,b\n"x""y",z')).toEqual([['a', 'b'], ['x"y', 'z']])
  })
  it('ignores trailing blank lines and CRLF', () => {
    expect(parseDelimited('a,b\r\n1,2\r\n\r\n')).toEqual([['a', 'b'], ['1', '2']])
  })
  it('returns [] for empty input', () => {
    expect(parseDelimited('   ')).toEqual([])
  })
})

describe('autoMapColumns', () => {
  it('maps the friend\'s headers', () => {
    expect(autoMapColumns(['Name', 'Contact', 'Area', 'Status', 'Remarks']))
      .toEqual({ name: 0, phone: 1, area: 2, status: 3, remarks: 4 })
  })
  it('matches aliases case-insensitively (Mobile, Location, Notes)', () => {
    const m = autoMapColumns(['Mobile', 'Location', 'Notes'])
    expect(m.phone).toBe(0)
    expect(m.area).toBe(1)
    expect(m.remarks).toBe(2)
    expect(m.name).toBeNull()
  })
  it('leaves unknown headers unmapped', () => {
    expect(autoMapColumns(['Foo', 'Bar']))
      .toEqual({ name: null, phone: null, area: null, status: null, remarks: null })
  })
})

describe('dupeKey', () => {
  it('keys by e164 when valid', () => {
    expect(dupeKey({ phoneE164: '+60123456789', phoneRaw: '012-3456789', name: 'A' })).toBe('e:+60123456789')
  })
  it('falls back to raw digits for an invalid phone', () => {
    expect(dupeKey({ phoneE164: null, phoneRaw: '012-xx', name: 'A' })).toBe('d:012')
  })
  it('falls back to the lowercased name when there is no phone', () => {
    expect(dupeKey({ phoneE164: null, phoneRaw: '', name: ' Ali ' })).toBe('n:ali')
  })
  it('is null when there is neither phone nor name', () => {
    expect(dupeKey({ phoneE164: null, phoneRaw: '', name: '' })).toBeNull()
  })
})

describe('markInBatchDupes (broadened)', () => {
  it('flags invalid-but-identical phones and phoneless same-name repeats', () => {
    const rows = [
      { phoneE164: null, phoneRaw: '012-x', name: 'Ali', duplicate: null as 'in-batch' | 'existing' | null },
      { phoneE164: null, phoneRaw: '012x', name: 'Ali2', duplicate: null as 'in-batch' | 'existing' | null },
      { phoneE164: null, phoneRaw: '', name: 'Bob', duplicate: null as 'in-batch' | 'existing' | null },
      { phoneE164: null, phoneRaw: '', name: 'bob', duplicate: null as 'in-batch' | 'existing' | null },
    ]
    markInBatchDupes(rows)
    expect(rows[1]!.duplicate).toBe('in-batch') // same digits "012"
    expect(rows[3]!.duplicate).toBe('in-batch') // same name
    expect(rows[0]!.duplicate).toBeNull()
    expect(rows[2]!.duplicate).toBeNull()
  })
})

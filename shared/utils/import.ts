export interface ColumnMap {
  name: number | null
  phone: number | null
  area: number | null
  status: number | null
  remarks: number | null
}

/** Row annotated by the server preview. Shared so the client can render it. */
export interface AnnotatedRow {
  index: number
  name: string
  phoneRaw: string
  phoneE164: string | null
  phoneValid: boolean
  area: string
  statusLabel: string
  statusId: number | null
  remarks: string
  valid: boolean
  error: string | null
  duplicate: 'existing' | 'in-batch' | null
}

export function detectDelimiter(line: string): '\t' | ',' {
  const tabs = (line.match(/\t/g) || []).length
  const commas = (line.match(/,/g) || []).length
  return tabs > 0 && tabs >= commas ? '\t' : ','
}

/** Parse pasted TSV or CSV text into a grid of trimmed string cells. */
export function parseDelimited(text: string): string[][] {
  const clean = (text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!clean) return []
  const delim = detectDelimiter(clean.split('\n')[0] ?? '')

  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i]
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += c
    } else if (c === '"') {
      inQuotes = true
    } else if (c === delim) {
      row.push(field); field = ''
    } else if (c === '\n') {
      row.push(field); rows.push(row); field = ''; row = []
    } else {
      field += c
    }
  }
  row.push(field); rows.push(row)
  return rows.map((r) => r.map((f) => f.trim())).filter((r) => r.some((f) => f !== ''))
}

const HEADER_ALIASES: Record<keyof ColumnMap, string[]> = {
  name: ['name', 'full name', 'lead', 'client', 'customer'],
  phone: ['phone', 'contact', 'number', 'mobile', 'hp', 'tel', 'telephone', 'phone number'],
  area: ['area', 'location', 'region', 'place', 'district', 'city'],
  status: ['status', 'stage'],
  remarks: ['remarks', 'remark', 'notes', 'note', 'comment', 'comments'],
}

/** Best-effort column map from a header row. Unknown headers stay null. */
export function autoMapColumns(header: string[]): ColumnMap {
  const map: ColumnMap = { name: null, phone: null, area: null, status: null, remarks: null }
  header.forEach((h, i) => {
    const key = h.trim().toLowerCase()
    for (const field of Object.keys(HEADER_ALIASES) as (keyof ColumnMap)[]) {
      if (map[field] === null && HEADER_ALIASES[field].includes(key)) {
        map[field] = i
        break
      }
    }
  })
  return map
}

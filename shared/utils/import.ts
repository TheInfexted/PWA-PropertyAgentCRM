import { normalizePhone } from '~~/shared/utils/phone'

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

export interface DraftCells {
  name: string
  phone: string
  area: string
  statusLabel: string
  remarks: string
}

export function toDraft(row: string[], map: ColumnMap): DraftCells {
  const at = (i: number | null) => (i === null ? '' : (row[i] ?? '').trim())
  return {
    name: at(map.name),
    phone: at(map.phone),
    area: at(map.area),
    statusLabel: at(map.status),
    remarks: at(map.remarks),
  }
}

export type NormalizedDraft = Omit<AnnotatedRow, 'index' | 'statusId' | 'duplicate'>

export function normalizeDraft(d: DraftCells): NormalizedDraft {
  const p = normalizePhone(d.phone)
  const valid = Boolean(d.name) || Boolean(d.phone)
  return {
    name: d.name,
    phoneRaw: p.raw,
    phoneE164: p.e164,
    phoneValid: p.valid,
    area: d.area,
    statusLabel: d.statusLabel,
    remarks: d.remarks,
    valid,
    error: valid ? null : 'No name or phone',
  }
}

/** Dedupe key: valid e164, else raw digits, else lowercased name, else null (un-dedupable). */
export function dupeKey(r: { phoneE164: string | null; phoneRaw: string; name: string }): string | null {
  if (r.phoneE164) return `e:${r.phoneE164}`
  const digits = (r.phoneRaw || '').replace(/[^\d]/g, '')
  if (digits) return `d:${digits}`
  const name = r.name.trim().toLowerCase()
  if (name) return `n:${name}`
  return null
}

/** Mutates rows in place: second+ occurrence of a dedupe key within the batch is 'in-batch'. */
export function markInBatchDupes(rows: Array<Pick<AnnotatedRow, 'phoneE164' | 'phoneRaw' | 'name' | 'duplicate'>>): void {
  const seen = new Set<string>()
  for (const r of rows) {
    const key = dupeKey(r)
    if (!key) continue
    if (seen.has(key)) r.duplicate = 'in-batch'
    else seen.add(key)
  }
}

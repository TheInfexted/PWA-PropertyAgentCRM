import type { AnnotatedRow, ColumnMap } from '~~/shared/utils/import'

export interface ImportPreview {
  rows: AnnotatedRow[]
  summary: {
    total: number
    valid: number
    errors: number
    existingDuplicates: number
    inBatchDuplicates: number
  }
}

/** Pure: split a parsed grid into a header row + body, synthesizing headers if needed. */
export function splitHeaderAndBody(
  grid: string[][],
  hasHeader: boolean,
): { header: string[]; body: string[][] } {
  if (!grid.length) return { header: [], body: [] }
  if (hasHeader) return { header: grid[0]!, body: grid.slice(1) }
  const width = Math.max(...grid.map((r) => r.length))
  const header = Array.from({ length: width }, (_, i) => `Column ${i + 1}`)
  return { header, body: grid }
}

export function useImport() {
  const request = useRequestFetch()
  async function preview(rows: string[][], map: ColumnMap) {
    return request<ImportPreview>('/api/import/preview', { method: 'POST', body: { rows, map } })
  }
  async function commit(rows: string[][], map: ColumnMap, includeDuplicates: boolean) {
    return request<{ inserted: number; skipped: number }>(
      '/api/import/commit',
      { method: 'POST', body: { rows, map, includeDuplicates } },
    )
  }
  return { preview, commit }
}

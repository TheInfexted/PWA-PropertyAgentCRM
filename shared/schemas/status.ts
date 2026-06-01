import { z } from 'zod'

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a #rrggbb colour')

export const statusCreateSchema = z.object({
  label: z.string().trim().min(1).max(80),
  color: hex.default('#9e5733'),
})

export const statusUpdateSchema = z.object({
  label: z.string().trim().min(1).max(80).optional(),
  color: hex.optional(),
})

export const reorderSchema = z.object({
  ids: z.array(z.number().int().positive()).max(100),
})

export type StatusCreate = z.infer<typeof statusCreateSchema>
export type StatusUpdate = z.infer<typeof statusUpdateSchema>

/** Next sort_order = max existing + 1 (0 when empty). */
export function nextSortOrder(existing: { sortOrder: number }[]): number {
  if (!existing.length) return 0
  return Math.max(...existing.map((s) => s.sortOrder)) + 1
}

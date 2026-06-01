import { z } from 'zod'
import { annotateRows } from '~~/server/utils/import.repo'

const bodySchema = z.object({
  rows: z.array(z.array(z.string())).max(5000),
  map: z.object({
    name: z.number().int().nullable(),
    phone: z.number().int().nullable(),
    area: z.number().int().nullable(),
    status: z.number().int().nullable(),
    remarks: z.number().int().nullable(),
  }),
})

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  const { rows, map } = bodySchema.parse(await readBody(event))
  const annotated = await annotateRows(ctx, rows, map)
  return {
    rows: annotated,
    summary: {
      total: annotated.length,
      valid: annotated.filter((r) => r.valid && r.duplicate === null).length,
      errors: annotated.filter((r) => !r.valid).length,
      existingDuplicates: annotated.filter((r) => r.duplicate === 'existing').length,
      inBatchDuplicates: annotated.filter((r) => r.duplicate === 'in-batch').length,
    },
  }
})

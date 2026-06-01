import { z } from 'zod'
import { commitRows } from '~~/server/utils/import.repo'

const bodySchema = z.object({
  rows: z.array(z.array(z.string())).max(5000),
  map: z.object({
    name: z.number().int().nullable(),
    phone: z.number().int().nullable(),
    area: z.number().int().nullable(),
    status: z.number().int().nullable(),
    remarks: z.number().int().nullable(),
  }),
  includeDuplicates: z.boolean().default(false),
})

export default defineEventHandler(async (event) => {
  const ctx = await requireContext(event)
  const { rows, map, includeDuplicates } = bodySchema.parse(await readBody(event))
  return commitRows(ctx, rows, map, includeDuplicates)
})

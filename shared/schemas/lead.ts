import { z } from 'zod'

// Base field shape — no `.default()` so partial updates only touch provided
// fields. The repository coalesces undefined values (`?? ''` / `?? [] / ?? null`).
export const leadFields = z.object({
  name: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(40).optional(),
  area: z.string().trim().max(120).optional(),
  statusId: z.number().int().positive().nullable().optional(),
  remarks: z.string().max(5000).optional(),
  assignedTo: z.number().int().positive().nullable().optional(),
  email: z.union([z.string().trim().email(), z.literal('')]).optional(),
  intent: z.enum(['buy', 'rent', 'sell', 'invest']).optional(),
  propertyType: z.string().trim().max(80).optional(),
  budgetMin: z.number().int().nonnegative().nullable().optional(),
  budgetMax: z.number().int().nonnegative().nullable().optional(),
  nextFollowUpAt: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Expected a YYYY-MM-DD date').nullable().optional(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
})

// Create: requires at least a name or a phone.
export const leadInputSchema = leadFields.refine(
  (d) => Boolean(d.name?.length) || Boolean(d.phone?.length),
  { message: 'A lead needs at least a name or a phone', path: ['name'] },
)

// Update: every field optional, no name-or-phone requirement, no defaults.
export const leadPatchSchema = leadFields.partial()

export type LeadInput = z.infer<typeof leadInputSchema>
export type LeadPatch = z.infer<typeof leadPatchSchema>

export const bulkActionSchema = z
  .object({
    ids: z.array(z.number().int().positive()).min(1).max(200),
    action: z.enum(['assign', 'status', 'delete']),
    assignedTo: z.number().int().positive().nullable().optional(),
    statusId: z.number().int().positive().nullable().optional(),
  })
  .refine((d) => d.action !== 'assign' || d.assignedTo !== undefined, { message: 'assign requires assignedTo', path: ['assignedTo'] })
  .refine((d) => d.action !== 'status' || d.statusId !== undefined, { message: 'status requires statusId', path: ['statusId'] })

export type BulkAction = z.infer<typeof bulkActionSchema>

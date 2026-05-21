import { z } from 'zod'

export const leadInputSchema = z.object({
  name: z.string().trim().max(200).optional().default(''),
  phone: z.string().trim().max(40).optional().default(''),
  area: z.string().trim().max(120).optional().default(''),
  statusId: z.number().int().positive().nullable().optional(),
  remarks: z.string().max(5000).optional().default(''),
  assignedTo: z.number().int().positive().nullable().optional(),
  email: z.union([z.string().trim().email(), z.literal('')]).optional(),
  intent: z.enum(['buy', 'rent', 'sell', 'invest']).optional(),
  propertyType: z.string().trim().max(80).optional(),
  budgetMin: z.number().int().nonnegative().nullable().optional(),
  budgetMax: z.number().int().nonnegative().nullable().optional(),
  nextFollowUpAt: z.string().datetime().nullable().optional(),
  tags: z.array(z.string().trim().max(40)).max(20).optional().default([]),
}).refine(
  (d) => Boolean(d.name?.length) || Boolean(d.phone?.length),
  { message: 'A lead needs at least a name or a phone', path: ['name'] },
)

export type LeadInput = z.infer<typeof leadInputSchema>

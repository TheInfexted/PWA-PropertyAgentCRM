import { z } from 'zod'
import { OPTIONAL_FIELD_KEYS } from '~~/shared/types'

export const workspaceSettingsSchema = z.object({
  enabledOptionalFields: z.array(z.enum(OPTIONAL_FIELD_KEYS)).max(5),
  areas: z.array(z.string().trim().min(1).max(120)).max(200),
})

export const workspacePatchSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    settings: workspaceSettingsSchema.optional(),
  })
  .refine((d) => d.name !== undefined || d.settings !== undefined, { message: 'Nothing to update' })

export type WorkspacePatch = z.infer<typeof workspacePatchSchema>

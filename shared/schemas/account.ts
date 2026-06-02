import { z } from 'zod'

const avatarData = z
  .string()
  .regex(/^data:image\/(png|jpe?g|webp);base64,/, 'Must be a PNG, JPEG or WebP image')
  .max(2_000_000)

export const accountUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    avatar: avatarData.nullable().optional(), // null clears the avatar
  })
  .refine((d) => d.name !== undefined || d.avatar !== undefined, { message: 'Nothing to update' })

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
})

export type AccountUpdate = z.infer<typeof accountUpdateSchema>

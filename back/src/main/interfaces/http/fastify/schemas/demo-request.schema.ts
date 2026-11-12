import { z } from 'zod/v4'

const line = (max: number) => z.string().trim().min(1).max(max)

export const demoRequestSchema = z.object({
  firstName: line(80),
  lastName: line(80),
  email: z.email().max(200),
  establishment: line(160),
  role: line(120),
  message: z.string().trim().max(2000).optional(),
  // Champ piège, invisible pour un humain : rempli, la demande est ignorée.
  website: z.string().max(200).optional(),
})

export type DemoRequestInput = z.infer<typeof demoRequestSchema>

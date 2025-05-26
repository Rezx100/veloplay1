import { z } from "zod";

export const networkChannelSchema = z.object({
  id: z.number(),
  name: z.string(),
  icon: z.string(),
  description: z.string(),
  isActive: z.boolean().default(true),
  isPremium: z.boolean().default(false),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const networkChannelInsertSchema = networkChannelSchema
  .omit({ createdAt: true, updatedAt: true });

export const networkChannelUpdateSchema = networkChannelSchema
  .omit({ createdAt: true, updatedAt: true })
  .partial();

export const networkChannelListSchema = networkChannelSchema.omit({
  createdAt: true,
  updatedAt: true
});

export type NetworkChannel = z.infer<typeof networkChannelSchema>;
export type NetworkChannelInsert = z.infer<typeof networkChannelInsertSchema>;
export type NetworkChannelUpdate = z.infer<typeof networkChannelUpdateSchema>;
export type NetworkChannelList = z.infer<typeof networkChannelListSchema>;
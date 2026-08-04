import { z } from "zod";

export const createClanSchema = z.object({
  name: z.string().trim().min(3, "Clan name must be at least 3 characters").max(30),
  tag: z
    .string()
    .trim()
    .min(2, "Tag must be 2-5 characters")
    .max(5)
    .regex(/^[A-Za-z0-9]+$/, "Tag can only contain letters and numbers"),
  logoUrl: z.union([z.url("Logo must be a valid URL"), z.literal("")]).optional(),
});

export const kickMemberSchema = z.object({
  userId: z.string().min(1, "userId is required"),
});

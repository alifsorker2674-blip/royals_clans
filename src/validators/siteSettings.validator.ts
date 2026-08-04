import { z } from "zod";

export const updateSiteSettingsSchema = z.object({
  announcement: z.string().trim().max(500).optional(),
  bannerUrl: z.union([z.url("Banner must be a valid URL"), z.literal("")]).optional(),
});

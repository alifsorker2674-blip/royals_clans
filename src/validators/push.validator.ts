import { z } from "zod";

export const subscribeSchema = z.object({
  endpoint: z.url("A valid push endpoint URL is required"),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const unsubscribeSchema = z.object({
  endpoint: z.url("A valid push endpoint URL is required"),
});

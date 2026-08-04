import { z } from "zod";

export const changeRoleSchema = z.object({
  role: z.enum(["user", "admin"]),
});

export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;

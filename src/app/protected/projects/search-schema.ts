import { z } from "zod";

import { PROJECT_TYPES } from "@/drizzle/constants";

export const searchSchema = z.object({
  limit: z.coerce.number().default(20),
  offset: z.coerce.number().default(0),
  sort: z.string().default("-createdAt"),
  tag: z.string().optional(),
  text: z.string().optional(),
  type: z.enum(PROJECT_TYPES).optional(),
});

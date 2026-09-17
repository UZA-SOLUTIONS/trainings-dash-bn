import { z } from "zod";

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid id");

export const createCohortSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(30),
  capacity: z.coerce.number().int().min(1).max(500).default(30),
  location: z.string().trim().max(120).optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  course_id: objectId.optional().nullable(),
  instructor_ids: z.array(objectId).optional().default([]),
});

export const updateCohortSchema = createCohortSchema.partial();

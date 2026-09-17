import { z } from "zod";

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, { message: "Choose a cohort" });

export const createCandidateSchema = z.object({
  cohort_id: objectId,
  full_name: z.string().trim().min(2).max(120),
  national_id: z.string().trim().min(5).max(32),
  date_of_birth: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  phone: z.string().trim().min(9).max(20),
  email: z.string().trim().email().max(255).or(z.literal("")).optional().nullable(),
  district: z.string().trim().max(60).optional().nullable(),
  status: z.enum(["enrolled", "waitlisted", "rejected", "withdrawn", "graduated"]).optional(),
});

export const bulkCreateCandidatesSchema = z.object({
  cohort_id: objectId,
  candidates: z
    .array(
      z.object({
        full_name: z.string().trim().min(2).max(120),
        national_id: z.string().trim().min(5).max(32),
        phone: z.string().trim().min(9).max(20),
        email: z.string().trim().email().max(255).or(z.literal("")).optional().nullable(),
        date_of_birth: z.string().optional().nullable(),
        gender: z.string().optional().nullable(),
        district: z.string().trim().max(60).optional().nullable(),
      }),
    )
    .min(1)
    .max(80),
});

export const updateCandidateSchema = z.object({
  full_name: z.string().trim().min(2).max(120).optional(),
  national_id: z.string().trim().min(5).max(32).optional(),
  date_of_birth: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  phone: z.string().trim().min(9).max(20).optional(),
  email: z.string().trim().email().max(255).or(z.literal("")).optional().nullable(),
  district: z.string().trim().max(60).optional().nullable(),
  status: z.enum(["enrolled", "waitlisted", "rejected", "withdrawn", "graduated"]).optional(),
  training_status: z.enum(["not_started", "in_progress", "completed", "failed"]).optional(),
  instructor_notes: z.string().max(2000).optional().nullable(),
  attendance_percentage: z.coerce.number().min(0).max(100).optional().nullable(),
  exam_score: z.coerce.number().min(0).max(100).optional().nullable(),
  disqualification_reason: z.string().max(500).optional().nullable(),
});

import mongoose from "mongoose";
import { AppError } from "./errors.js";
import { Cohort } from "../models/Cohort.js";
import { Candidate } from "../models/Candidate.js";

export const ROLES = ["admin", "instructor"];

export const MEMBERSHIP_FIELDS = ["status"];
export const TRAINING_FIELDS = [
  "training_status",
  "attendance_percentage",
  "exam_score",
  "instructor_notes",
  "disqualification_reason",
];
export const IDENTITY_FIELDS = [
  "full_name",
  "national_id",
  "date_of_birth",
  "gender",
  "phone",
  "email",
  "district",
];

export function isAdmin(user) {
  return user?.role === "admin";
}

export function assertAdmin(user) {
  if (!isAdmin(user)) {
    throw new AppError("Only an admin can do this", 403, "FORBIDDEN");
  }
}

export function isInstructor(user) {
  return user?.role === "instructor";
}

export function canAccessTab(user, tab) {
  if (!user) return false;
  if (isAdmin(user) || isInstructor(user)) {
    return ["overview", "cohorts", "candidates", "courses", "modules", "settings"].includes(tab);
  }
  return false;
}

export function filterCandidatePatch(user, patch) {
  if (isAdmin(user)) return { ...patch };

  const allowed = isInstructor(user)
    ? [...MEMBERSHIP_FIELDS, ...TRAINING_FIELDS, ...IDENTITY_FIELDS]
    : [];

  const filtered = {};
  for (const key of Object.keys(patch)) {
    if (allowed.includes(key)) {
      filtered[key] = patch[key];
    }
  }

  if (isInstructor(user) && filtered.status === "rejected" && !filtered.disqualification_reason?.trim()) {
    throw new AppError(
      "A disqualification reason is required when rejecting a candidate",
      400,
      "VALIDATION_ERROR",
    );
  }

  if (Object.keys(filtered).length === 0) {
    throw new AppError("You cannot update these fields", 403, "FORBIDDEN");
  }

  return filtered;
}

export async function cohortIdsForUser(user) {
  if (!user) return [];
  if (isAdmin(user)) return null;
  const cohorts = await Cohort.find({ instructor_ids: user.id }).select("_id").lean();
  return cohorts.map((c) => String(c._id));
}

export async function assertCohortAccess(user, cohortId) {
  if (isAdmin(user)) {
    if (!mongoose.isValidObjectId(cohortId)) {
      throw new AppError("Cohort not found", 404, "NOT_FOUND");
    }
    return;
  }

  if (!mongoose.isValidObjectId(cohortId)) {
    throw new AppError("Cohort not found", 404, "NOT_FOUND");
  }

  const cohort = await Cohort.findById(cohortId).select("instructor_ids").lean();
  if (!cohort) throw new AppError("Cohort not found", 404, "NOT_FOUND");

  const assigned = (cohort.instructor_ids ?? []).some((id) => String(id) === String(user.id));
  if (!assigned) {
    throw new AppError("You do not have access to this cohort", 403, "FORBIDDEN");
  }
}

export async function assertCandidateAccess(user, candidateOrId) {
  let cohortId = candidateOrId?.cohort_id;
  if (!cohortId) {
    if (!mongoose.isValidObjectId(candidateOrId)) {
      throw new AppError("Candidate not found", 404, "NOT_FOUND");
    }
    const candidate = await Candidate.findById(candidateOrId).select("cohort_id").lean();
    if (!candidate) throw new AppError("Candidate not found", 404, "NOT_FOUND");
    cohortId = candidate.cohort_id;
  }
  await assertCohortAccess(user, cohortId);
}

export function tokenPayloadForUser(user) {
  return {
    sub: String(user._id ?? user.id),
    email: user.email,
    role: user.role,
  };
}

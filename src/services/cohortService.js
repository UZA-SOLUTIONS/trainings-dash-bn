import mongoose from "mongoose";
import { Cohort } from "../models/Cohort.js";
import { Course } from "../models/Course.js";
import { StaffUser } from "../models/StaffUser.js";
import { Candidate } from "../models/Candidate.js";
import { AppError } from "../utils/errors.js";
import { toJSON } from "../utils/serialize.js";
import { assertCohortAccess, cohortIdsForUser, isInstructor, assertAdmin } from "../utils/permissions.js";

const POPULATE = [
  { path: "course_id", select: "name code status" },
  { path: "instructor_ids", select: "full_name email role" },
];

export function serializeCohort(doc) {
  if (!doc) return null;
  const json = toJSON(doc);
  const course = json.course_id && typeof json.course_id === "object" && json.course_id.name
    ? {
        id: String(json.course_id.id ?? json.course_id._id),
        name: json.course_id.name,
        code: json.course_id.code,
        status: json.course_id.status,
      }
    : null;
  const instructors = Array.isArray(json.instructor_ids)
    ? json.instructor_ids
        .filter((row) => row && typeof row === "object" && (row.email || row.full_name))
        .map((row) => ({
          id: String(row.id ?? row._id),
          full_name: row.full_name ?? null,
          email: row.email,
          role: row.role,
        }))
    : [];

  json.course_id = course?.id ?? (json.course_id ? String(json.course_id) : null);
  json.instructor_ids = instructors.length
    ? instructors.map((i) => i.id)
    : (json.instructor_ids ?? []).map((id) => String(id?.id ?? id?._id ?? id)).filter(Boolean);
  json.course = course;
  json.instructors = instructors;
  json.timetable = Array.isArray(json.timetable)
    ? json.timetable.map((row) => ({
        id: String(row.id ?? row._id),
        day: row.day,
        start_time: row.start_time,
        end_time: row.end_time,
        module_id: row.module_id ? String(row.module_id.id ?? row.module_id._id ?? row.module_id) : null,
        title: row.title ?? null,
        room: row.room ?? null,
        notes: row.notes ?? null,
      }))
    : [];
  return json;
}

async function validateLinks(payload) {
  if (payload.course_id) {
    if (!mongoose.isValidObjectId(payload.course_id)) {
      throw new AppError("Course not found", 404, "NOT_FOUND");
    }
    const course = await Course.findById(payload.course_id).select("_id");
    if (!course) throw new AppError("Course not found", 404, "NOT_FOUND");
  }

  if (payload.instructor_ids) {
    const ids = [...new Set(payload.instructor_ids)];
    if (ids.length === 0) return { ...payload, instructor_ids: [] };
    const staff = await StaffUser.find({ _id: { $in: ids } }).select("_id");
    if (staff.length !== ids.length) {
      throw new AppError("One or more instructors were not found", 400, "VALIDATION_ERROR");
    }
    return { ...payload, instructor_ids: ids };
  }
  return payload;
}

export async function listCohorts(user) {
  const filter = {};
  const scoped = await cohortIdsForUser(user);
  if (scoped) filter._id = { $in: scoped };
  const cohorts = await Cohort.find(filter).populate(POPULATE).sort({ start_date: 1, name: 1 });
  return cohorts.map(serializeCohort);
}

export async function getCohortById(user, id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Cohort not found", 404, "NOT_FOUND");
  }
  await assertCohortAccess(user, id);
  const cohort = await Cohort.findById(id).populate(POPULATE);
  if (!cohort) throw new AppError("Cohort not found", 404, "NOT_FOUND");
  return serializeCohort(cohort);
}

export async function createCohort(user, payload) {
  assertAdmin(user);
  const data = await validateLinks(payload);
  if (isInstructor(user)) {
    const ids = new Set((data.instructor_ids ?? []).map(String));
    ids.add(String(user.id));
    data.instructor_ids = [...ids];
  }
  try {
    const cohort = await Cohort.create(data);
    await cohort.populate(POPULATE);
    return serializeCohort(cohort);
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError("A cohort with this code already exists", 409, "DUPLICATE_CODE");
    }
    throw new AppError(err.message, 400, "COHORT_CREATE_FAILED");
  }
}

export async function updateCohort(user, id, payload) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Cohort not found", 404, "NOT_FOUND");
  }
  assertAdmin(user);
  const data = await validateLinks(payload);
  if (isInstructor(user) && data.instructor_ids) {
    const ids = new Set(data.instructor_ids.map(String));
    ids.add(String(user.id));
    data.instructor_ids = [...ids];
  }
  const cohort = await Cohort.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true,
  }).populate(POPULATE);
  if (!cohort) throw new AppError("Cohort not found", 404, "NOT_FOUND");
  return serializeCohort(cohort);
}

export async function updateTimetable(user, id, timetable) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Cohort not found", 404, "NOT_FOUND");
  }
  await assertCohortAccess(user, id);
  const cohort = await Cohort.findById(id);
  if (!cohort) throw new AppError("Cohort not found", 404, "NOT_FOUND");
  cohort.timetable = (timetable || []).map((row) => ({
    ...(row.id && mongoose.isValidObjectId(row.id) ? { _id: row.id } : {}),
    day: row.day,
    start_time: row.start_time,
    end_time: row.end_time,
    module_id: row.module_id && mongoose.isValidObjectId(row.module_id) ? row.module_id : null,
    title: row.title?.trim() ? row.title.trim() : null,
    room: row.room?.trim() ? row.room.trim() : null,
    notes: row.notes?.trim() ? row.notes.trim() : null,
  }));
  await cohort.save();
  await cohort.populate(POPULATE);
  return serializeCohort(cohort);
}

export async function deleteCohort(user, id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Cohort not found", 404, "NOT_FOUND");
  }
  assertAdmin(user);

  const candidateCount = await Candidate.countDocuments({ cohort_id: id });
  if (candidateCount > 0) {
    throw new AppError(
      `Cannot delete cohort with ${candidateCount} candidate(s). Move or remove them first.`,
      409,
      "COHORT_HAS_CANDIDATES",
    );
  }

  const cohort = await Cohort.findByIdAndDelete(id);
  if (!cohort) throw new AppError("Cohort not found", 404, "NOT_FOUND");
  return serializeCohort(cohort);
}

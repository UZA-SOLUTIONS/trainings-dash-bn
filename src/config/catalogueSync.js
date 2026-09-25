import { env } from "./env.js";
import { Course } from "../models/Course.js";
import { TrainingModule } from "../models/TrainingModule.js";
import { Cohort } from "../models/Cohort.js";
import { Candidate } from "../models/Candidate.js";
import { Assessment } from "../models/Assessment.js";
import { AttendanceSession } from "../models/AttendanceSession.js";
import { formatCandidateCode, nextCandidateSequence } from "../models/Counter.js";

export async function migrateTrnCandidateCodes() {
  const rows = await Candidate.find({ candidate_code: /^TRN-/i });
  let updated = 0;
  for (const row of rows) {
    const next = row.candidate_code.replace(/^TRN-/i, "UZA-");
    const clash = await Candidate.findOne({
      candidate_code: next,
      _id: { $ne: row._id },
    });
    if (clash) continue;
    row.candidate_code = next;
    await row.save();
    updated += 1;
  }
  if (updated) console.log(`Renamed ${updated} candidate IDs from TRN- to UZA-`);
}

function exportUrl() {
  const base = env.TRAININGS_BN_URL.replace(/\/$/, "");
  if (base.endsWith("/api")) return `${base}/catalogue/export`;
  return `${base}/api/catalogue/export`;
}

function schoolMatches(target) {
  if (!target) return true;
  const local = (env.SCHOOL_CODE || "").trim().toLowerCase();
  if (!local) return true;
  return local === String(target).trim().toLowerCase();
}

async function upsertCourse(entry) {
  const fields = {
    name: entry.name,
    description: entry.description ?? null,
    duration_weeks: entry.duration_weeks ?? 4,
    status: entry.status || "active",
  };
  let course = await Course.findOne({ code: entry.code });
  if (course) {
    Object.assign(course, fields);
    await course.save();
  } else {
    course = await Course.create({ ...fields, code: entry.code });
  }

  const incomingCodes = new Set((entry.modules ?? []).map((mod) => mod.code));
  for (const mod of entry.modules ?? []) {
    const payload = {
      name: mod.name,
      description: mod.description ?? null,
      content: mod.content ?? null,
      contents: mod.contents ?? [],
      attachments: mod.attachments ?? [],
      sort_order: mod.sort_order ?? 1,
      duration_hours: mod.duration_hours ?? 4,
      status: mod.status || "active",
      course_id: course._id,
    };
    const existing = await TrainingModule.findOne({ course_id: course._id, code: mod.code });
    if (existing) {
      Object.assign(existing, payload);
      await existing.save();
    } else {
      await TrainingModule.create({ ...payload, code: mod.code });
    }
  }

  const leftover = await TrainingModule.find({
    course_id: course._id,
    code: { $nin: [...incomingCodes] },
  });
  for (const mod of leftover) {
    const used = await Promise.all([
      Assessment.exists({ module_id: mod._id }),
      AttendanceSession.exists({ module_id: mod._id }),
    ]);
    if (used.some(Boolean) && mod.status !== "archived") {
      mod.status = "archived";
      await mod.save();
    }
  }

  return course;
}

async function upsertIntake(intake, course) {
  const fields = {
    name: intake.name,
    capacity: intake.capacity || 30,
    location: intake.location ?? null,
    start_date: intake.start_date ?? null,
    end_date: intake.end_date ?? null,
    notes: intake.notes ?? null,
    course_id: course?._id ?? null,
  };
  let cohort = await Cohort.findOne({ code: intake.code });
  if (cohort) {
    Object.assign(cohort, fields);
    await cohort.save();
  } else {
    cohort = await Cohort.create({ ...fields, code: intake.code, instructor_ids: [] });
  }

  for (const row of intake.roster ?? []) {
    const existing = await Candidate.findOne({
      cohort_id: cohort._id,
      national_id: row.national_id,
    });
    if (existing) {
      if (existing.source === "institution") continue;
      existing.full_name = row.full_name;
      existing.phone = row.phone;
      existing.gender = row.gender ?? existing.gender;
      existing.district = row.district ?? existing.district;
      existing.date_of_birth = row.date_of_birth ?? existing.date_of_birth;
      existing.email = row.email || existing.email;
      existing.source = "provided";
      if (row.candidate_code && existing.candidate_code !== row.candidate_code) {
        const clash = await Candidate.findOne({
          candidate_code: row.candidate_code,
          _id: { $ne: existing._id },
        });
        if (!clash) existing.candidate_code = row.candidate_code;
      }
      await existing.save();
      continue;
    }

    const candidate_code =
      row.candidate_code || formatCandidateCode(await nextCandidateSequence());
    await Candidate.create({
      cohort_id: cohort._id,
      candidate_code,
      full_name: row.full_name,
      national_id: row.national_id,
      phone: row.phone,
      gender: row.gender ?? null,
      district: row.district ?? null,
      date_of_birth: row.date_of_birth ?? null,
      email: row.email || null,
      status: row.status === "waitlisted" ? "waitlisted" : "enrolled",
      training_status: "not_started",
      source: "provided",
    });
  }

  return cohort;
}

export async function syncCatalogueFromUza() {
  if (!env.TRAININGS_BN_URL || !env.CATALOGUE_SYNC_SECRET) {
    console.log("Catalogue sync skipped: TRAININGS_BN_URL / CATALOGUE_SYNC_SECRET not set");
    return false;
  }

  const response = await fetch(exportUrl(), {
    headers: { "X-Catalogue-Key": env.CATALOGUE_SYNC_SECRET },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Catalogue export failed (${response.status}): ${text.slice(0, 300)}`);
  }
  const body = await response.json();
  const catalogue = body.data ?? body;
  const courses = catalogue.courses ?? [];
  const intakes = catalogue.intakes ?? [];

  const courseByCode = new Map();
  for (const entry of courses) {
    const course = await upsertCourse(entry);
    courseByCode.set(entry.code, course);
  }

  let intakeCount = 0;
  for (const intake of intakes) {
    if (!schoolMatches(intake.target_school_code)) continue;
    const course = intake.course_code ? courseByCode.get(intake.course_code) : null;
    await upsertIntake(intake, course || (await Course.findOne({ code: intake.course_code })));
    intakeCount += 1;
  }

  console.log(`Catalogue sync: ${courses.length} courses, ${intakeCount} intakes`);
  return true;
}

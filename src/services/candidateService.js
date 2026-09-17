import mongoose from "mongoose";
import { Candidate } from "../models/Candidate.js";
import { Cohort } from "../models/Cohort.js";
import { AttendanceRecord } from "../models/AttendanceRecord.js";
import { AttendanceSession } from "../models/AttendanceSession.js";
import { Assessment } from "../models/Assessment.js";
import { AssessmentScore } from "../models/AssessmentScore.js";
import { CandidateIssue } from "../models/CandidateIssue.js";
import { formatCandidateCode, nextCandidateSequence } from "../models/Counter.js";
import { AppError } from "../utils/errors.js";
import { toJSON, toJSONList } from "../utils/serialize.js";
import {
  IDENTITY_FIELDS,
  assertCandidateAccess,
  assertCohortAccess,
  cohortIdsForUser,
  filterCandidatePatch,
} from "../utils/permissions.js";
import { serializeCohort } from "./cohortService.js";

async function assignSeat(cohort) {
  const taken = await Candidate.countDocuments({
    cohort_id: cohort._id,
    status: { $in: ["enrolled", "graduated"] },
  });

  if (taken < cohort.capacity) {
    return { status: "enrolled", waitlist_position: null };
  }

  const last = await Candidate.findOne({
    cohort_id: cohort._id,
    status: "waitlisted",
  })
    .sort({ waitlist_position: -1 })
    .select("waitlist_position")
    .lean();

  return {
    status: "waitlisted",
    waitlist_position: (last?.waitlist_position ?? 0) + 1,
  };
}

async function promoteWaitlist(cohortId) {
  const cohort = await Cohort.findById(cohortId);
  if (!cohort) return;

  let taken = await Candidate.countDocuments({
    cohort_id: cohortId,
    status: { $in: ["enrolled", "graduated"] },
  });

  while (taken < cohort.capacity) {
    const next = await Candidate.findOne({
      cohort_id: cohortId,
      status: "waitlisted",
    }).sort({ waitlist_position: 1, created_at: 1 });

    if (!next) break;

    next.status = "enrolled";
    next.waitlist_position = null;
    await next.save();
    taken += 1;
  }
}

function serializeCandidate(doc) {
  const json = toJSON(doc);
  json.cohort_id = json.cohort_id ? String(json.cohort_id) : null;
  return json;
}

export async function createCandidate(user, payload) {
  if (!mongoose.isValidObjectId(payload.cohort_id)) {
    throw new AppError("Cohort not found", 404, "NOT_FOUND");
  }
  await assertCohortAccess(user, payload.cohort_id);

  const cohort = await Cohort.findById(payload.cohort_id);
  if (!cohort) throw new AppError("Cohort not found", 404, "NOT_FOUND");

  const seat = await assignSeat(cohort);
  const seq = await nextCandidateSequence();
  const candidate_code = formatCandidateCode(seq);

  try {
    const candidate = await Candidate.create({
      cohort_id: cohort._id,
      candidate_code,
      full_name: payload.full_name,
      national_id: payload.national_id,
      date_of_birth: payload.date_of_birth ?? null,
      gender: payload.gender ?? null,
      phone: payload.phone,
      email: payload.email || null,
      district: payload.district ?? null,
      status: payload.status ?? seat.status,
      waitlist_position: payload.status === "enrolled" ? null : seat.waitlist_position,
      source: "institution",
    });

    return serializeCandidate(candidate);
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError("This national ID is already in this cohort.", 409, "DUPLICATE_APPLICATION");
    }
    throw new AppError(err.message, 400, "CANDIDATE_CREATE_FAILED");
  }
}

export async function bulkCreateCandidates(user, { cohort_id, candidates }) {
  await assertCohortAccess(user, cohort_id);
  const created = [];
  const errors = [];

  for (let index = 0; index < candidates.length; index += 1) {
    try {
      const candidate = await createCandidate(user, { ...candidates[index], cohort_id });
      created.push(candidate);
    } catch (err) {
      errors.push({
        index,
        national_id: candidates[index].national_id,
        message: err.message || "Could not add candidate",
      });
    }
  }

  return { created, errors };
}

export async function listCandidates(user, { cohortId } = {}) {
  const filter = {};
  if (cohortId) {
    if (!mongoose.isValidObjectId(cohortId)) return [];
    await assertCohortAccess(user, cohortId);
    filter.cohort_id = cohortId;
  } else {
    const scoped = await cohortIdsForUser(user);
    if (scoped) {
      if (scoped.length === 0) return [];
      filter.cohort_id = { $in: scoped };
    }
  }

  const candidates = await Candidate.find(filter).sort({
    waitlist_position: 1,
    created_at: 1,
  });

  return toJSONList(candidates).map((c) => ({
    ...c,
    cohort_id: String(c.cohort_id),
  }));
}

export async function listCandidatesSummary(user) {
  const filter = {};
  const scoped = await cohortIdsForUser(user);
  if (scoped) {
    if (scoped.length === 0) return [];
    filter.cohort_id = { $in: scoped };
  }

  const candidates = await Candidate.find(filter)
    .select("cohort_id status training_status")
    .lean();

  return candidates.map((c) => ({
    id: String(c._id),
    cohort_id: String(c.cohort_id),
    status: c.status,
    training_status: c.training_status,
  }));
}

export async function getCandidateProfile(user, id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Candidate not found", 404, "NOT_FOUND");
  }

  const candidate = await Candidate.findById(id);
  if (!candidate) throw new AppError("Candidate not found", 404, "NOT_FOUND");
  await assertCandidateAccess(user, candidate);

  const [cohortDoc, issues, sessions, assessments] = await Promise.all([
    Cohort.findById(candidate.cohort_id).populate([
      { path: "course_id", select: "name code status" },
      { path: "instructor_ids", select: "full_name email role" },
    ]),
    CandidateIssue.find({ candidate_id: candidate._id }).sort({ created_at: -1 }).limit(20),
    AttendanceSession.find({ cohort_id: candidate.cohort_id }).sort({ date: -1 }).limit(40),
    Assessment.find({ cohort_id: candidate.cohort_id }).sort({ date: -1, created_at: -1 }),
  ]);

  const sessionIds = sessions.map((s) => s._id);
  const assessmentIds = assessments.map((a) => a._id);

  const [records, scores] = await Promise.all([
    sessionIds.length
      ? AttendanceRecord.find({ session_id: { $in: sessionIds }, candidate_id: candidate._id })
      : [],
    assessmentIds.length
      ? AssessmentScore.find({ assessment_id: { $in: assessmentIds }, candidate_id: candidate._id })
      : [],
  ]);

  const recordBySession = new Map(records.map((r) => [String(r.session_id), r]));
  const scoreByAssessment = new Map(scores.map((s) => [String(s.assessment_id), s]));

  return {
    candidate: serializeCandidate(candidate),
    cohort: serializeCohort(cohortDoc),
    issues: issues.map((issue) => {
      const json = toJSON(issue);
      json.candidate_id = String(json.candidate_id);
      json.cohort_id = String(json.cohort_id);
      json.reported_by = json.reported_by ? String(json.reported_by) : null;
      return json;
    }),
    recent_sessions: sessions.map((session) => {
      const record = recordBySession.get(String(session._id));
      return {
        id: String(session._id),
        date: session.date,
        session_label: session.session_label,
        activity_notes: session.activity_notes,
        module_id: session.module_id ? String(session.module_id) : null,
        status: record?.status ?? null,
        note: record?.note ?? null,
      };
    }),
    scores: assessments.map((assessment) => {
      const score = scoreByAssessment.get(String(assessment._id));
      return {
        assessment_id: String(assessment._id),
        title: assessment.title,
        type: assessment.type,
        date: assessment.date,
        max_score: assessment.max_score,
        is_final: assessment.is_final,
        score: score?.score ?? null,
        remarks: score?.remarks ?? null,
      };
    }),
  };
}

export async function updateCandidate(user, id, patch) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Candidate not found", 404, "NOT_FOUND");
  }

  const existing = await Candidate.findById(id);
  if (!existing) throw new AppError("Candidate not found", 404, "NOT_FOUND");
  await assertCandidateAccess(user, existing);

  const filteredPatch = filterCandidatePatch(user, patch);
  if (existing.source !== "institution") {
    const identityTouched = IDENTITY_FIELDS.some((field) =>
      Object.prototype.hasOwnProperty.call(filteredPatch, field),
    );
    if (identityTouched) {
      throw new AppError(
        "UZA-provided candidates cannot have identity edited",
        403,
        "PROVIDED_LOCKED",
      );
    }
  }
  const previousStatus = existing.status;
  Object.assign(existing, filteredPatch);
  await existing.save();

  if (
    ["enrolled", "graduated"].includes(previousStatus) &&
    ["rejected", "withdrawn"].includes(existing.status)
  ) {
    await promoteWaitlist(existing.cohort_id);
  }

  return serializeCandidate(existing);
}

export async function deleteCandidate(user, id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Candidate not found", 404, "NOT_FOUND");
  }

  const existing = await Candidate.findById(id);
  if (!existing) throw new AppError("Candidate not found", 404, "NOT_FOUND");
  await assertCandidateAccess(user, existing);
  if (existing.source !== "institution") {
    throw new AppError("UZA-provided candidates cannot be deleted", 403, "PROVIDED_LOCKED");
  }

  const previousStatus = existing.status;
  const cohortId = existing.cohort_id;

  await Promise.all([
    AttendanceRecord.deleteMany({ candidate_id: existing._id }),
    AssessmentScore.deleteMany({ candidate_id: existing._id }),
    CandidateIssue.deleteMany({ candidate_id: existing._id }),
  ]);
  await existing.deleteOne();

  if (["enrolled", "graduated"].includes(previousStatus)) {
    await promoteWaitlist(cohortId);
  }

  return { id: String(id) };
}

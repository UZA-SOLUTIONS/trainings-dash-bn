import { Cohort } from "../models/Cohort.js";
import { Candidate } from "../models/Candidate.js";
import { Course } from "../models/Course.js";
import { TrainingModule } from "../models/TrainingModule.js";
import { AttendanceSession } from "../models/AttendanceSession.js";
import { AttendanceRecord } from "../models/AttendanceRecord.js";
import { Assessment } from "../models/Assessment.js";
import { AssessmentScore } from "../models/AssessmentScore.js";
import { CandidateIssue } from "../models/CandidateIssue.js";
import { StaffUser } from "../models/StaffUser.js";
import { formatCandidateCode, nextCandidateSequence } from "../models/Counter.js";
import { DEFAULT_CANDIDATES } from "./seedRoster.js";

function isoFromDate(d) {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function daysAgo(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return isoFromDate(d);
}

function recentWeekdays(count) {
  const dates = [];
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  while (dates.length < count) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) dates.push(isoFromDate(d));
    d.setDate(d.getDate() - 1);
  }
  return dates.reverse();
}

const ATTENDANCE_CYCLE = ["present", "present", "present", "late", "present", "absent", "present", "excused"];
const CURRENT_STATUSES = [
  ...Array(20).fill("enrolled"),
  ...Array(3).fill("waitlisted"),
  ...Array(2).fill("withdrawn"),
  ...Array(3).fill("graduated"),
];
const CURRENT_TRAINING = [
  ...Array(4).fill("not_started"),
  ...Array(12).fill("in_progress"),
  ...Array(3).fill("completed"),
  "failed",
  ...Array(8).fill("not_started"),
];

const ISSUE_SPECS = [
  { category: "attendance", severity: "medium", status: "open", title: "Late three days this week", offset: 2 },
  { category: "academic", severity: "low", status: "open", title: "Needs extra charging practice", offset: 4 },
  { category: "conduct", severity: "high", status: "in_progress", title: "Phone use during roll call", offset: 6 },
  { category: "health", severity: "medium", status: "in_progress", title: "Reported fatigue on yard circuit", offset: 5 },
  { category: "academic", severity: "high", status: "open", title: "Missed written practice quiz", offset: 3 },
  { category: "other", severity: "low", status: "resolved", title: "Uniform not ready on day one", offset: 12, resolution: "Candidate brought uniform the next morning." },
  { category: "attendance", severity: "high", status: "resolved", title: "Unexcused absence after warning", offset: 10, resolution: "Sat a catch-up session with the instructor." },
  { category: "conduct", severity: "medium", status: "resolved", title: "Cabin presentation below standard", offset: 8, resolution: "Re-checked the following day." },
  { category: "academic", severity: "low", status: "open", title: "Range planning still unclear", offset: 1 },
  { category: "health", severity: "low", status: "resolved", title: "Short illness, returned with note", offset: 14, resolution: "Cleared to resume training." },
];

async function createCandidate(row, cohort, status, trainingStatus) {
  const seq = await nextCandidateSequence();
  return Candidate.create({
    candidate_code: formatCandidateCode(seq),
    cohort_id: cohort._id,
    status,
    waitlist_position: status === "waitlisted" ? seq : null,
    full_name: row.name,
    national_id: `1199${String(seq).padStart(12, "0")}`,
    gender: row.gender ?? null,
    phone: row.phone,
    district: row.district ?? null,
    training_status: trainingStatus,
    instructor_notes: row.notes ?? null,
    source: "institution",
  });
}

async function seedCurrentClass(instructor, course, modules) {
  let current = await Cohort.findOne({ code: "TRN-01" });
  const start = daysAgo(21);
  const end = daysAgo(-21);
  const fields = {
    name: "Kigali EV intake",
    code: "TRN-01",
    capacity: 30,
    location: "Kigali",
    start_date: start,
    end_date: end,
    notes: "Current classroom intake for local demo.",
    course_id: course?._id ?? null,
    instructor_ids: instructor ? [instructor._id] : [],
  };
  if (current) {
    Object.assign(current, fields);
    await current.save();
  } else {
    current = await Cohort.create(fields);
  }

  const currentRows = DEFAULT_CANDIDATES.slice(0, 28);
  const candidates = [];
  for (let i = 0; i < currentRows.length; i += 1) {
    const created = await createCandidate(
      currentRows[i],
      current,
      CURRENT_STATUSES[i] ?? "enrolled",
      CURRENT_TRAINING[i] ?? "in_progress",
    );
    candidates.push(created);
  }

  const roster = candidates.filter((c) => c.status === "enrolled" || c.status === "graduated");
  const sessionDates = recentWeekdays(12);
  const sessions = [];
  for (let i = 0; i < sessionDates.length; i += 1) {
    const session = await AttendanceSession.create({
      cohort_id: current._id,
      date: sessionDates[i],
      session_label: "full_day",
      activity_notes: `Classroom and yard work — day ${i + 1}.`,
      module_id: modules[i % Math.max(modules.length, 1)]?._id ?? null,
      recorded_by: instructor?._id ?? null,
    });
    sessions.push(session);
    const records = roster.map((candidate, idx) => ({
      session_id: session._id,
      candidate_id: candidate._id,
      status: ATTENDANCE_CYCLE[(i + idx) % ATTENDANCE_CYCLE.length],
      note: null,
    }));
    if (records.length) await AttendanceRecord.insertMany(records);
  }

  if (!current.timetable?.length && modules.length) {
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    const slots = [
      ["08:00", "10:00"],
      ["10:15", "12:15"],
      ["12:15", "13:15"],
      ["13:15", "15:15"],
      ["15:30", "17:00"],
    ];
    let slotIndex = 0;
    current.timetable = days.flatMap((day) =>
      slots.map(([start, end]) => {
        if (start === "12:15") {
          return {
            day,
            start_time: start,
            end_time: end,
            module_id: null,
            title: "Break",
            room: null,
            notes: null,
          };
        }
        const mod = modules[slotIndex % modules.length];
        slotIndex += 1;
        return {
          day,
          start_time: start,
          end_time: end,
          module_id: mod?._id ?? null,
          title: null,
          room: current.location || "Classroom",
          notes: null,
        };
      }),
    );
    await current.save();
  }

  const assessmentSpecs = [
    { title: "Safety quiz", type: "quiz", max: 20, date: sessionDates[2] ?? daysAgo(12), module: modules[0], final: false },
    { title: "Charging quiz", type: "quiz", max: 20, date: sessionDates[5] ?? daysAgo(8), module: modules[1], final: false },
    { title: "Service test", type: "test", max: 50, date: sessionDates[8] ?? daysAgo(5), module: modules[2], final: false },
    { title: "Written exam", type: "exam", max: 100, date: sessionDates[11] ?? daysAgo(1), module: modules[4] ?? modules[0], final: true },
  ];

  for (const spec of assessmentSpecs) {
    const assessment = await Assessment.create({
      cohort_id: current._id,
      title: spec.title,
      type: spec.type,
      max_score: spec.max,
      date: spec.date,
      module_id: spec.module?._id ?? null,
      is_final: spec.final,
      created_by: instructor?._id ?? null,
    });
    const scores = roster.map((candidate, idx) => {
      if (idx % 7 === 0) return null;
      const ratio = 0.62 + ((idx * 7) % 30) / 100;
      return {
        assessment_id: assessment._id,
        candidate_id: candidate._id,
        score: Math.min(spec.max, Math.round(spec.max * ratio)),
        remarks: idx % 11 === 0 ? "Needs follow-up" : null,
      };
    }).filter(Boolean);
    if (scores.length) await AssessmentScore.insertMany(scores);
  }

  for (let i = 0; i < ISSUE_SPECS.length; i += 1) {
    const spec = ISSUE_SPECS[i];
    const candidate = roster[i % roster.length];
    if (!candidate) continue;
    const issue = await CandidateIssue.create({
      candidate_id: candidate._id,
      cohort_id: current._id,
      reported_by: instructor?._id ?? null,
      category: spec.category,
      severity: spec.severity,
      title: spec.title,
      description: spec.title,
      status: spec.status,
      resolution_notes: spec.resolution ?? null,
      resolved_at: spec.status === "resolved" ? new Date() : null,
    });
    const created = new Date();
    created.setDate(created.getDate() - spec.offset);
    await CandidateIssue.updateOne({ _id: issue._id }, { $set: { created_at: created } });
  }

  return current;
}

const DEMO_CODES = ["TRN-00", "TRN-01"];

async function clearDemoClassroomData() {
  const cohorts = await Cohort.find({ code: { $in: DEMO_CODES } }).select("_id").lean();
  const cohortIds = cohorts.map((c) => c._id);
  if (!cohortIds.length) return;

  const sessions = await AttendanceSession.find({ cohort_id: { $in: cohortIds } }).select("_id").lean();
  const sessionIds = sessions.map((s) => s._id);
  if (sessionIds.length) await AttendanceRecord.deleteMany({ session_id: { $in: sessionIds } });
  await AttendanceSession.deleteMany({ cohort_id: { $in: cohortIds } });

  const assessments = await Assessment.find({ cohort_id: { $in: cohortIds } }).select("_id").lean();
  const assessmentIds = assessments.map((a) => a._id);
  if (assessmentIds.length) await AssessmentScore.deleteMany({ assessment_id: { $in: assessmentIds } });
  await Assessment.deleteMany({ cohort_id: { $in: cohortIds } });

  await CandidateIssue.deleteMany({ cohort_id: { $in: cohortIds } });
  await Candidate.deleteMany({ cohort_id: { $in: cohortIds } });
}

async function seedPastClass(instructor, course) {
  let past = await Cohort.findOne({ code: "TRN-00" });
  const fields = {
    name: "Kigali EV intake (previous)",
    code: "TRN-00",
    capacity: 24,
    location: "Kigali",
    start_date: daysAgo(90),
    end_date: daysAgo(30),
    notes: "Completed previous intake for local demo.",
    course_id: course?._id ?? null,
    instructor_ids: instructor ? [instructor._id] : [],
  };
  if (past) {
    Object.assign(past, fields);
    await past.save();
  } else {
    past = await Cohort.create(fields);
  }

  const rows = DEFAULT_CANDIDATES.slice(28, 36);
  for (const row of rows) {
    await createCandidate(row, past, "graduated", "completed");
  }
  return past;
}

export async function seedDemoClassroom() {
  const instructor = await StaffUser.findOne({ email: "instructor@uza.rw" });
  const course = await Course.findOne({ code: "TT-EV-CORE" });
  const modules = course
    ? await TrainingModule.find({ course_id: course._id }).sort({ sort_order: 1 })
    : [];

  await clearDemoClassroomData();
  await seedCurrentClass(instructor, course, modules);
  await seedPastClass(instructor, course);
  console.log("Seeded demo classroom data (TRN-01 current, TRN-00 previous)");
}

export async function seedDemoClassroomIfEmpty() {
  const existing = await Candidate.countDocuments();
  if (existing > 0) return;
  await seedDemoClassroom();
}

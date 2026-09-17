import bcrypt from "bcryptjs";
import { Cohort } from "../models/Cohort.js";
import { StaffUser } from "../models/StaffUser.js";
import { Course } from "../models/Course.js";
import { TrainingModule } from "../models/TrainingModule.js";
import { env } from "./env.js";
import { DEFAULT_COURSES } from "./seedCatalogue.js";
import { syncCatalogueFromUza } from "./catalogueSync.js";

const DEFAULT_STAFF = [
  {
    email: "admin@uza.rw",
    full_name: "Training Admin",
    role: "admin",
  },
  {
    email: "instructor@uza.rw",
    full_name: "Training Instructor",
    role: "instructor",
  },
];

export async function seedStaff() {
  const password_hash = await bcrypt.hash(env.SEED_STAFF_PASSWORD, 12);

  for (const staff of DEFAULT_STAFF) {
    const existing = await StaffUser.findOne({ email: staff.email }).lean();
    if (existing) continue;
    await StaffUser.create({
      ...staff,
      password_hash,
    });
    console.log(`Seeded staff: ${staff.email}`);
  }
}

export async function seedCoursesIfEmpty() {
  const courseCount = await Course.countDocuments();
  if (courseCount > 0) {
    return Course.findOne({ code: "TT-EV-CORE" });
  }

  let moduleTotal = 0;
  let core = null;
  for (const entry of DEFAULT_COURSES) {
    const { modules, ...courseFields } = entry;
    const course = await Course.create(courseFields);
    if (course.code === "TT-EV-CORE") core = course;
    if (modules?.length) {
      await TrainingModule.insertMany(
        modules.map((mod) => ({
          ...mod,
          course_id: course._id,
          status: "active",
        })),
      );
      moduleTotal += modules.length;
    }
  }
  console.log(`Seeded ${DEFAULT_COURSES.length} courses and ${moduleTotal} modules`);
  return core;
}

export async function seedFallbackCohort(instructor, course) {
  const existing = await Cohort.countDocuments();
  if (existing > 0) return Cohort.findOne();

  const cohort = await Cohort.create({
    name: "Local demo class",
    code: "TRN-01",
    capacity: 30,
    location: "Kigali",
    start_date: null,
    end_date: null,
    notes: "Local fallback class. Connect TRAININGS_BN_URL to receive UZA intakes.",
    course_id: course?._id ?? null,
    instructor_ids: instructor ? [instructor._id] : [],
  });
  console.log("Seeded empty local class TRN-01");
  return cohort;
}

export async function seedIfEmpty() {
  await seedStaff();

  const instructor = await StaffUser.findOne({ email: "instructor@uza.rw" });
  let synced = false;
  try {
    synced = await syncCatalogueFromUza();
  } catch (err) {
    console.error("Catalogue sync failed:", err.message);
  }

  if (!synced) {
    const course = await seedCoursesIfEmpty();
    await seedFallbackCohort(instructor, course);
  }

  if (instructor) {
    await Cohort.updateMany(
      { instructor_ids: { $size: 0 } },
      { $addToSet: { instructor_ids: instructor._id } },
    );
  }
}

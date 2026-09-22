import mongoose from "mongoose";
import { connectDatabase } from "./database.js";
import { seedCoursesIfEmpty, seedStaff } from "./seed.js";
import { seedDemoClassroom } from "./seedClassroom.js";

async function main() {
  await connectDatabase();
  await seedStaff();
  await seedCoursesIfEmpty();
  await seedDemoClassroom();
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Demo classroom seed failed:", err);
  process.exit(1);
});

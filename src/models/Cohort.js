import mongoose from "mongoose";

const cohortSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true },
    capacity: { type: Number, required: true, default: 30, min: 1 },
    location: { type: String, default: null },
    start_date: { type: String, default: null },
    end_date: { type: String, default: null },
    notes: { type: String, default: null },
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
      index: true,
    },
    instructor_ids: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "StaffUser" }],
      default: [],
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

export const Cohort = mongoose.model("Cohort", cohortSchema);

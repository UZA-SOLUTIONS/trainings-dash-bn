import mongoose from "mongoose";

const candidateSchema = new mongoose.Schema(
  {
    candidate_code: { type: String, required: true, unique: true },
    cohort_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cohort",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["enrolled", "waitlisted", "rejected", "withdrawn", "graduated"],
      default: "enrolled",
    },
    waitlist_position: { type: Number, default: null },

    full_name: { type: String, required: true },
    national_id: { type: String, required: true },
    date_of_birth: { type: String, default: null },
    gender: { type: String, default: null },
    phone: { type: String, required: true },
    email: { type: String, default: null },
    district: { type: String, default: null },

    training_status: {
      type: String,
      enum: ["not_started", "in_progress", "completed", "failed"],
      default: "not_started",
    },
    attendance_percentage: { type: Number, default: null },
    exam_score: { type: Number, default: null },
    instructor_notes: { type: String, default: null },
    disqualification_reason: { type: String, default: null },
    source: {
      type: String,
      enum: ["provided", "institution"],
      default: "institution",
      index: true,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

candidateSchema.index({ cohort_id: 1, national_id: 1 }, { unique: true });

export const Candidate = mongoose.model("Candidate", candidateSchema);

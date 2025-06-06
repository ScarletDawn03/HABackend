import mongoose from "mongoose";

const resumeFilterConditionSchema = new mongoose.Schema(
  {
    field: {
      type: String,
      required: true,
      trim: true,
    },
    requirement: {
      type: String,
      required: true,
    },
    interpretedByLLM: {
      type: String,
      required: false,
    },
  },
  { _id: false }
);

const resumeFilterSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      trim: true,
    },
    conditions: {
      type: [resumeFilterConditionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("ResumeFilter", resumeFilterSchema);

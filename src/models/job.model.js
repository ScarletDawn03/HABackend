import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    employmentType: {
      type: String,
      enum: ["Full-Time", "Part-Time", "Contract", "Internship"],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    requirements: [String],
    salaryRange: {
      min: Number,
      max: Number,
      currency: {
        type: String,
        default: "MYR",
      },
    },
    status: {
      type: String,
      enum: ["Open", "Closed", "Paused"],
      default: "Open",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Job", jobSchema);

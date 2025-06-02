import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema({
  applicantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Applicant',
    required: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  status: {
    type: String,
    enum: ['applied', 'screened', 'verified', 'interview scheduled'],
    default: 'applied'
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
}, { timestamps: true });

export default mongoose.model("Application", applicationSchema);
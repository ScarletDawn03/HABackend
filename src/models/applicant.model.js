import mongoose from "mongoose";

const educationSchema = new mongoose.Schema({
  institution: { type: String, required: true },
  degree: { type: String, required: true },
  fieldOfStudy: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
});

const workExperienceSchema = new mongoose.Schema({
  company: { type: String, required: true },
  jobTitle: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  responsibilities: { type: String, required: true },
});

const languageSchema = new mongoose.Schema({
  language: { type: String, required: true },
  proficiency: { type: String, required: true }, // e.g., Native, Fluent, Intermediate
});

const applicantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
    email: { type: String, required: true, unique: true },
    dateOfBirth: { type: Date, required: true },
    education: [educationSchema],
    workExperience: [workExperienceSchema],
    skills: [String],
    languages: [languageSchema],
    resumeUrl: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

const Applicant = mongoose.models.Applicant || mongoose.model("Applicant", applicantSchema);

export default Applicant;
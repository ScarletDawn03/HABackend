import Application from "../models/application.model.js";
import Job from "../models/job.model.js";
import Applicant from "../models/applicant.model.js";
import mongoose from "mongoose";

export const getApplicantsByJobId = async (jobId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      throw new Error("Invalid job ID format");
    }

    // Find applications for the given job and populate only the user details
    const applications = await Application.find({ jobId: jobId })
      .populate("applicantId");

    const applicants = applications.map(app => ({
      applicationId: app._id,
      applicant: app.applicantId,
      appliedAt: app.appliedAt,
      status: app.status,
    }));

    return applicants;
  } catch (error) {
    console.error("Error fetching applicants for job:", error);
    throw new Error(`Fetching applicants for job failed: ${error.message}`);
  }
};

export const createApplication = async (applicationData) => {
  try {
    const { applicantId, jobId } = applicationData;

    const applicantExists = await Applicant.findById(applicantId);
    if (!applicantExists) {
      throw new Error("Applicant not found");
    }

    const jobExists = await Job.findById(jobId);
    if (!jobExists) {
      throw new Error("Job not found");
    }

    const application = new Application(applicationData);
    return await application.save();
  } catch (error) {
    console.error("Error creating application:", error);
    throw new Error(`Application creation failed: ${error.message}`);
  }
};

export const updateApplicationStatus = async (applicantId, jobId, status) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(applicantId) || !mongoose.Types.ObjectId.isValid(jobId)) {
      throw new Error("Invalid applicant ID or job ID format");
    }

    const validStatuses = ["verified", "screened", "interview scheduled", "applied"];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Allowed statuses are: ${validStatuses.join(", ")}`);
    }

    const updatedApplication = await Application.findOneAndUpdate(
      { applicantId, jobId },
      { status, updatedAt: new Date() },
      { new: true }
    );

    if (!updatedApplication) {
      throw new Error("Application not found for the given applicant and job");
    }

    return updatedApplication;
  } catch (error) {
    console.error("Error updating application status:", error);
    throw new Error(`Updating application status failed: ${error.message}`);
  }
};

import Application from "../models/application.model.js";
import mongoose from "mongoose";

export const getApplicantsByJobId = async (jobId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      throw new Error("Invalid job ID format");
    }

    // Find applications for the given job and populate only the user details
    const applications = await Application.find({ jobId: jobId })
      .populate({
        path: "userId",
        select: "-syncedMessageIds -accessToken -refreshToken -__v" // Exclude uneccessary fields
      });

    const applicants = applications.map(app => ({
      applicationId: app._id,
      user: app.userId,
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
    const application = new Application(applicationData);
    return await application.save();
  } catch (error) {
    console.error("Error creating application:", error);
    throw new Error(`Application creation failed: ${error.message}`);
  }
};
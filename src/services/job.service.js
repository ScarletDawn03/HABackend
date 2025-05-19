import Job from "../models/job.model.js";
import mongoose from "mongoose";

export const getAllJobs = async () => {
  try {
    const jobs = await Job.find();
    return jobs;
  } catch (error) {
    console.error("Error fetching jobs:", error);
    throw new Error(`Fetching jobs failed: ${error.message}`);
  }
};

export const createJob = async (jobData) => {
  try {
    const job = new Job(jobData);
    await job.save();
    return job;
  } catch (error) {
    console.error("Error creating job:", error);
    throw new Error(`Job creation failed: ${error.message}`);
  }
};

export const deleteJob = async (id) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid job ID format");
    }
    const result = await Job.deleteOne({ _id: id });
    return result;
  } catch (error) {
    console.error("Error deleting job:", error);
    throw new Error(`Job deletion failed: ${error.message}`);
  }
};

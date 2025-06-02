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
export const getJobById = async (id) => {
  try {
    const jobs = await Job.findById(id);
    return jobs;
  } catch (error) {
    console.error("Error fetching jobs:", error);
    throw new Error(`Fetching jobs failed: ${error.message}`);
  }
};

export const createJob = async (jobData) => {
  try {
    const job = new Job(jobData);
    return await job.save();
  } catch (error) {
    console.error("Error creating job:", error);
    throw new Error(`Job creation failed: ${error.message}`);
  }
};

export const updateJob = async (id, jobData) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid job ID format");
    }

    const job = await Job.findById(id);
    if (!job) {
      throw new Error("Job not found");
    }
    
    Object.assign(job, jobData); // Merge new data into the document
    await job.save();

    return job;
  } catch (error) {
    console.error("Error updating job:", error);
    throw new Error(`Job update failed: ${error.message}`);
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

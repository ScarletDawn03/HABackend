import Job from "../models/job.model.js";

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

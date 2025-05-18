import * as jobService from "../services/job.service.js";

// Get all jobs
export const getJobsController = async (req, res) => {
  try {
    const jobs = await jobService.getAllJobs();
    return res.status(200).json(jobs);
  } catch (error) {
    console.error("Error in getJobsController:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Create a job
export const createJobController = async (req, res) => {
  try {
    const job = await jobService.createJob(req.body);
    return res.status(201).json(job);
  } catch (error) {
    console.error("Error in createJobController:", error);
    return res.status(500).json({ message: error.message });
  }
};

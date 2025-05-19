import * as jobService from "../services/job.service.js";

// Get all jobs
export const getJobsController = async (req, res) => {
  try {
    const jobs = await jobService.getAllJobs();
    return res.status(200).json({
      success: true,
      count: jobs.length,
      jobs: jobs
    });
  } catch (error) {
    console.error("Error in getJobsController:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
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

// Delete a job
export const deleteJobController = async (req, res) => {
  try {
    const id = req.params.id;

    const result = await jobService.deleteJob(id);

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    return res.status(200).json({ success: true, message: "Job deleted successfully" });
  } catch (error) {
    console.error("Error in deleteJobController:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

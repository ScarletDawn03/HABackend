import * as jobService from "../services/job.service.js";

// Get all jobs
export const getAllJobsController = async (req, res) => {
  try {
    const jobs = await jobService.getAllJobs();
    return res.status(200).json({
      success: true,
      count: jobs.length,
      jobs
    });
  } catch (error) {
    console.error("Error in getAllJobsController:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get job by id
export const getJobByIdController = async (req, res) => {
  const { id } = req.params;
  try {
    const job = await jobService.getJobById(id);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    return res.status(200).json({ success: true, job });
  } catch (error) {
    console.error("Error in getJobByIdController:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Create a job
export const createJobController = async (req, res) => {
  try {
    const job = await jobService.createJob(req.body);
    return res.status(200).json(
      {
        status: true,
        message: "Job created successfully",
        data: job
      }
    );
  } catch (error) {
    console.error("Error in createJobController:", error);
    return res.status(500).json(
      {
        status: false,
        message: error.message
      });
  }
};

// Update a job
export const updateJobController = async (req, res) => {
  try {
    const id = req.params.id;
    const result = await jobService.updateJob(id, req.body);
    return res.status(200).json({
      success: true,
      message: "Job updated successfully",
      data: result
    });
  } catch (error) {
    console.error("Error in UpdateJobController:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
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

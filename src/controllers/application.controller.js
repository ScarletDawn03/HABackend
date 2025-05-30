import * as applicationService from "../services/application.service.js";

// Get applicants by job ID
export const getApplicantsByJobIdController = async (req, res) => {
  const { jobId } = req.params;

  try {
    const applicants = await applicationService.getApplicantsByJobId(jobId);

    return res.status(200).json({
      success: true,
      count: applicants.length,
      applicants,
    });
  } catch (error) {
    console.error("Error in getApplicantsByJobIdController:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Create a new application
export const createApplicationController = async (req, res) => {
  try {
    const application = await applicationService.createApplication(req.body);

    return res.status(201).json({
      success: true,
      message: "Application created successfully",
      data: application,
    });
  } catch (error) {
    console.error("Error in createApplicationController:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

import * as resumeFilterService from "../services/resumeFilter.service.js";

// Get Resume Filter by jobId
export const getResumeFilterByJobIdController = async (req, res) => {
  const { jobId } = req.params;

  try {
    const resumeFilter = await resumeFilterService.getResumeFilterByJobId(
      jobId
    );
    if (!resumeFilter) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Resume filter not found for jobId " + jobId,
        });
    }
    return res.status(200).json({ success: true, data: resumeFilter });
  } catch (error) {
    console.error("Error in getResumeFilterByJobIdController:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Upsert Resume Filter
export const upsertResumeFilterController = async (req, res) => {
  const { jobId, conditions } = req.body;

  try {
    const upsertedFilter = await resumeFilterService.upsertResumeFilter(
      jobId,
      conditions
    );
    return res.status(200).json({
      success: true,
      message: "Resume filter upserted successfully",
      data: upsertedFilter,
    });
  } catch (error) {
    console.error("Error in upsertResumeFilterController:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

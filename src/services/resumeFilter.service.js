import ResumeFilter from "../models/resumeFilter.model.js";

export const getResumeFilterByJobId = async (jobId) => {
  try {
    const resumeFilter = await ResumeFilter.findOne({ jobId });
    return resumeFilter;
  } catch (error) {
    throw new Error(`Fetching resume filter failed: ${error.message}`);
  }
};

export const upsertResumeFilter = async (jobId, conditions) => {
  try {
    const updatedFilter = await ResumeFilter.findOneAndUpdate(
      { jobId },
      { jobId, conditions },
      {
        upsert: true,
        new: true, // Return the updated (or newly created) document
        setDefaultsOnInsert: true,
      }
    );
    return updatedFilter;
  } catch (error) {
    throw new Error(`Upserting resume filter failed: ${error.message}`);
  }
};

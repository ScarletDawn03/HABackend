import ResumeFilter from "../models/resumeFilter.model.js";
import { getResponseFromO4Mini } from "./openai.service.js";
import { FILTER_CONFIGURATION_REFINEMENT } from "./../prompts.js";

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

export const refineResumeFilter = async (formattedFilter) => {
  try {
    const rawRefinedFilter = await getResponseFromO4Mini({
      userPrompt: formattedFilter,
      systemPrompt: FILTER_CONFIGURATION_REFINEMENT,
    });

    let cleaned = rawRefinedFilter.trim();
    if (cleaned.startsWith("```") && cleaned.endsWith("```")) {
      cleaned = cleaned.slice(3, -3).trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      throw new Error("Failed to parse LLM response as JSON");
    }

    if (!Array.isArray(parsed.refined_conditions)) {
      throw new Error("refined_conditions not found or invalid");
    }

    return parsed.refined_conditions;
  } catch (error) {
    throw new Error(`Refining resume filter failed: ${error.message}`);
  }
};

import * as scheduleService from "../services/schedule.service.js";

// Add available interview dates
export const addInterviewDatesController = async (req, res) => {
  const { userId } = req.params;
  const { dates } = req.body;
  try {
    const updatedUser = await scheduleService.addAvailableInterviewDates(userId, dates);

    return res.status(200).json({
      success: true,
      message: "Interview dates added successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error in addInterviewDatesController:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
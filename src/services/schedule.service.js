import User from "../models/user.model.js";
import mongoose from "mongoose";

export const addAvailableInterviewDates = async (userId, dates) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user ID format");
    }

    if (!Array.isArray(dates) || dates.some(d => !d.start || !d.end)) {
      throw new Error("Invalid dates format. Expected array of { start, end } objects.");
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $push: { availableInterviewDates: { $each: dates } } },
      { new: true } // return updated document
    );

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  } catch (error) {
    console.error("Error adding interview dates:", error);
    throw new Error(`Adding interview dates failed: ${error.message}`);
  }
};

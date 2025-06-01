// models/User.model.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  refreshToken: { type: String },
  accessToken: { type: String }, // optional
  lastHistoryId: { type: String }, // for incremental sync
  syncedMessageIds: { type: [String], default: [] }, // NEW: Track all previously pulled Gmail message IDs
  availableInterviewDates: [
    {
      start: { type: Date, required: true },
      end: { type: Date, required: true }
    }
  ]
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
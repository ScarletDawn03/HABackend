// models/User.model.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  refreshToken: { type: String },
  accessToken: { type: String }, // optional
});

export default mongoose.model("User", userSchema);

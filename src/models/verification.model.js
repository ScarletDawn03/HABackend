// src/models/verification.model.js
import mongoose from 'mongoose';

const verificationSchema = new mongoose.Schema({
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Applicant', required: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  // Remove questions field since we're using CAPTCHA now
}, { timestamps: true });

const Verification = mongoose.models.Verification || mongoose.model('Verification', verificationSchema);

export default Verification;
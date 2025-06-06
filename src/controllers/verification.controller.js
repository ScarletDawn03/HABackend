// src/controllers/verification.controller.js
import { createVerificationToken, getVerificationByToken,  verifyRecaptchaToken  } from '../services/verification.service.js';
import { sendVerificationEmailViaGmail } from '../services/gmail.service.js';
import Applicant from '../models/applicant.model.js';
import Application from '../models/application.model.js'; // For status update
import User from '../models/User.model.js';

export async function startVerification(req, res) {
  try {
    const hrEmail = req.session?.userEmail;
    if (!hrEmail) return res.status(401).json({ error: 'Unauthorized' });

    const { jobID, applicants } = req.body;
    if (!jobID || !Array.isArray(applicants)) {
      return res.status(400).json({ error: 'Missing job ID or applicants array' });
    }

    const user = await User.findOne({ email: hrEmail });
    if (!user || !user.accessToken) {
      return res.status(403).json({ error: 'Gmail access token missing' });
    }

    const frontendBaseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
    const results = [];

    for (const candidateId of applicants) {
      try {
        const candidate = await Applicant.findById(candidateId);
        if (!candidate) {
          results.push({ candidateId, success: false, error: 'Candidate not found' });
          continue;
        }

        const token = await createVerificationToken({ candidateId, jobId: jobID });
        const verificationLink = `${frontendBaseUrl}/verify-captcha?token=${token}`;

        await sendVerificationEmailViaGmail({
          accessToken: user.accessToken,
          senderEmail: hrEmail,
          candidateEmail: candidate.email,
          candidateName: candidate.name,
          jobTitle: 'the position you applied for',
          link: verificationLink,
        });

        results.push({ candidateId, success: true });
      } catch (err) {
        console.error(`Error sending verification to candidate ${candidateId}:`, err);
        results.push({ candidateId, success: false, error: 'Email send failed' });
      }
    }

    return res.status(200).json({
      message: 'Verification process completed',
      results,
    });
  } catch (err) {
    console.error('Error in startVerification:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
export async function getVerificationByTokenController(req, res) {
  const { token } = req.params;
  try {
    const verification = await getVerificationByToken(token);
    if (!verification) return res.status(404).json({ error: 'Token expired or invalid' });
    res.status(200).json({ valid: true }); // Return valid flag only
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function submitVerification(req, res) {
  const { token, captchaToken } = req.body;

  if (!token || !captchaToken) {
    return res.status(400).json({ error: 'Missing token or captcha' });
  }

  try {
    const isHuman = await verifyRecaptchaToken(captchaToken);
    if (!isHuman) {
      return res.status(403).json({ error: 'Captcha verification failed' });
    }

    const verification = await getVerificationByToken(token);
    if (!verification) {
      return res.status(404).json({ error: 'Invalid or expired token' });
    }

    //Update application status
    await Application.findOneAndUpdate(
      {
        applicantId: verification.candidateId,
        jobId: verification.jobId,
      },
      { status: 'verified' }
    );

    return res.status(200).json({ message: 'Verification successful' });
  } catch (err) {
    console.error('Error in submitVerification:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

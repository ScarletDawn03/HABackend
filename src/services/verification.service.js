import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import axios from 'axios';
import Verification from '../models/verification.model.js';

export async function createVerificationToken({ candidateId, jobId }) {
  const token = uuidv4();
  const expiresAt = dayjs().add(48, 'hour').toDate();

  await Verification.create({
    candidateId,
    jobId,
    token,
    expiresAt,
  });

  return token;
}

export async function getVerificationByToken(token) {
  return await Verification.findOne({ token });
}

export async function markVerified(token) {
  const verification = await Verification.findOne({ token });
  if (!verification) return null;

  await Verification.deleteOne({ token }); 
  return verification;
}

export async function verifyRecaptchaToken(captchaToken) {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  try {
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: secretKey,
          response: captchaToken,
        },
      }
    );

    return response.data.success;
  } catch (error) {
    console.error('Captcha verification error:', error);
    return false;
  }
}

// src/routes/auth.routes.js
import express from 'express';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import User from '../models/User.model.js'; 
dotenv.config();

const router = express.Router();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Scopes: Gmail + email address
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
  'openid',
];

// Redirect to Google login
router.get('/auth/google', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });

  console.log('Redirecting to Google OAuth URL:', url);
  res.redirect(url);
});

// Callback URI
router.get("/auth/google/callback", async (req, res) => {
  try {
    const { code } = req.query;
    console.log("OAuth callback received code:", code);
    const { tokens } = await oauth2Client.getToken(code);
    console.log("Received tokens:", {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ? 'present' : 'not present',
      expiry_date: tokens.expiry_date,
    });

    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();
    const userEmail = data.email;
    console.log("User email retrieved:", userEmail);

    await User.findOneAndUpdate(
      { email: userEmail },
      {
        email: userEmail,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token, // might be undefined if not first time
      },
      { upsert: true, new: true }
    );

    console.log("Saved user:", userEmail);
    res.redirect("http://localhost:5173/home");

  } catch (err) {
  console.error("OAuth callback error:", err?.response?.data || err.message || err);
  res.status(500).send("Authentication failed.");
  }
});

export default router;
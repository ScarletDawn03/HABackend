// src/services/calendar.service.js
import { google } from 'googleapis';
import User from '../models/user.model.js';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

async function setCredentials(userEmail) {
  const user = await User.findOne({ email: userEmail });
  if (!user) throw new Error('User not found');

  oauth2Client.setCredentials({
    access_token: user.accessToken,
    refresh_token: user.refreshToken,
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export async function createCalendarEvent(userEmail, eventData) {
  const calendar = await setCredentials(userEmail);

  // Normalize date-time strings for Google Calendar API
  function normalizeDateTime(dateTime) {
    if (!dateTime) return null;
    if (!dateTime.endsWith('Z') && !dateTime.includes('+')) {
      return dateTime + ':00Z'; // add seconds and UTC timezone
    }
    return dateTime;
  }

  const event = {
    summary: eventData.summary,
    description: eventData.description,
    start: { dateTime: normalizeDateTime(eventData.start) },
    end: { dateTime: normalizeDateTime(eventData.end) },
    attendees: Array.isArray(eventData.email)
      ? eventData.email.map((e) => ({ email: e }))
      : eventData.email
        ? [{ email: eventData.email }]
        : [],
  };

  console.log('Event to create:', JSON.stringify(event, null, 2));

  try {
    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: 'all',
    });
    return res.data;
  } catch (error) {
    console.error('Create event error:', error.response?.data || error.message);
    throw error;
  }
}


export async function getUpcomingEvents(userEmail) {
  const calendar = await setCredentials(userEmail);

  try {
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    console.log("Raw event data:", JSON.stringify(res.data.items, null, 2));

    const events = res.data.items.map(event => ({
      summary: event.summary,
      start: event.start?.dateTime || event.start?.date || null,
      end: event.end?.dateTime || event.end?.date || null,
      attendees: event.attendees?.map(a => ({
        email: a.email,
        status: a.responseStatus,
      })) || [],
    }));

    console.log(`Events fetched for ${userEmail}:`, events.length);
    return events;
  } catch (err) {
    console.error('Get events error:', err.response?.data || err.message);
    throw err;
  }
}
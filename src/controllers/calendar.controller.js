// src/controllers/calendar.controller.js
import User from '../models/user.model.js'; 
import { createCalendarEvent, getUpcomingEvents } from '../services/calandar.service.js';

export async function createEvent(req, res) {
  try {
    const userEmail = req.session?.userEmail;
    if (!userEmail) {
      console.error('No userEmail in session');
      return res.status(401).json({ error: 'Unauthorized: user email not found in session' });
    }
    console.log('Creating event for user:', userEmail);

    const event = await createCalendarEvent(userEmail, req.body);
    res.status(201).json(event);
  } catch (error) {
    console.error('Create event error:', error.message);
    res.status(500).json({ error: error.message });
  }
}


export async function getEvents(req, res) {
  try {
    const userEmail = req.session?.userEmail;
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log("Looking for user with email:", userEmail);

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const events = await getUpcomingEvents(userEmail);
    res.status(200).json(events);
  } catch (error) {
    console.error('Get events error:', error.message);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
}

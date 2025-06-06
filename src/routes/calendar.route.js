// src/routes/calendar.routes.js
import express from 'express';
import { createEvent, getEvents } from '../controllers/calendar.controller.js';


const router = express.Router();

router.post('/createEvent', createEvent);
router.get('/getEvent', getEvents);

export default router;

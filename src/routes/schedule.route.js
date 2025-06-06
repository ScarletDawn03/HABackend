import express from "express";
import { addInterviewDatesController } from "../controllers/schedule.controller.js";

const router = express.Router();

router.post('/add-dates/:userId', addInterviewDatesController);

export default router;

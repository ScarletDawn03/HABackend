// src/routes/verification.route.js
import express from 'express';
import {startVerification, getVerificationByTokenController,submitVerification} from '../controllers/verification.controller.js';

const router = express.Router();

router.post('/start', startVerification);
router.get('/:token', getVerificationByTokenController);
router.post('/submit', submitVerification); // <-- New route

export default router;

import express from 'express';
import { jobsController } from '../controllers/job.controller.js';

const router = express.Router();

router.get('/', jobsController);

export default router;
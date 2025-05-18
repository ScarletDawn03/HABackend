import express from "express";
import {
  getJobsController,
  createJobController,
} from "../controllers/job.controller.js";

const router = express.Router();

router.get("/", getJobsController);
router.post("/", createJobController);

export default router;

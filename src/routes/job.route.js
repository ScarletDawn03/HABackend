import express from "express";
import {
  getJobsController,
  createJobController,
  deleteJobController,
} from "../controllers/job.controller.js";

const router = express.Router();

router.get("/get-jobs", getJobsController);
router.post("/create-job", createJobController);
router.get("/delete-job/:id", deleteJobController);

export default router;

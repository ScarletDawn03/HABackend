import express from "express";
import {
  getJobsController,
  createJobController,
  deleteJobController,
  updateJobController
} from "../controllers/job.controller.js";

const router = express.Router();

router.get("/get-jobs", getJobsController);
router.post("/create-job", createJobController);
router.post("/update-job/:id", updateJobController);
router.get("/delete-job/:id", deleteJobController);

export default router;

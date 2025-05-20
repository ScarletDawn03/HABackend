import express from "express";
import {
  getAllJobsController,
  createJobController,
  deleteJobController,
  updateJobController,
  getJobByIdController
} from "../controllers/job.controller.js";

const router = express.Router();

router.get("/get-jobs", getAllJobsController);
router.get("/get-jobs/:id", getJobByIdController);
router.post("/create-job", createJobController);
router.post("/update-job/:id", updateJobController);
router.get("/delete-job/:id", deleteJobController);

export default router;

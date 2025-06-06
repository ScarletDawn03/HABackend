import express from "express";
import {
  getApplicantsByJobIdController,
  createApplicationController,
  updateApplicationStatusController,
} from "../controllers/application.controller.js";

const router = express.Router();

router.get("/get-applicants/:jobId", getApplicantsByJobIdController);
router.post("/", createApplicationController);
router.put("/update-status/:applicantId/:jobId", updateApplicationStatusController);

export default router;

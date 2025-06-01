import express from "express";
import {
  getApplicantsByJobIdController,
  createApplicationController,
} from "../controllers/application.controller.js";

const router = express.Router();

router.get("/get-applicants/:jobId", getApplicantsByJobIdController);
router.post("/", createApplicationController);

export default router;

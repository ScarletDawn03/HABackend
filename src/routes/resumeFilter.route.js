import express from "express";
import {
  getResumeFilterByJobIdController,
  upsertResumeFilterController,
} from "../controllers/resumeFilter.controller.js";

const router = express.Router();

router.get("/get-filters/:jobId", getResumeFilterByJobIdController);
router.post("/upsert-filter", upsertResumeFilterController);

export default router;

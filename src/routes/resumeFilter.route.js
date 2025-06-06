import express from "express";
import {
  getResumeFilterByJobIdController,
  upsertResumeFilterController,
  refineResumeFilterController
} from "../controllers/resumeFilter.controller.js";

const router = express.Router();

router.get("/get-filters/:jobId", getResumeFilterByJobIdController);
router.post("/upsert-filter", upsertResumeFilterController);
router.post("/refine-filter", refineResumeFilterController);

export default router;

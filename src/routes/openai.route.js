import express from "express";
import { getO4MiniResponseController } from "../controllers/openai.controller.js";

const router = express.Router();
router.post("/o4-mini", getO4MiniResponseController);

export default router;

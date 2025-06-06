import express from "express";
import { getHrEmailController } from "../controllers/hr.controller.js";

const router = express.Router();

router.get("/get-email", getHrEmailController);
export default router;

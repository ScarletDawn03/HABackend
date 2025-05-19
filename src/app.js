import express from "express";
import cors from "cors";
import jobRoute from "./routes/job.route.js";
import resumeUploadRoutes from "./routes/resumeUpload.js";

const app = express();

app.use(cors());

app.use(express.json());

// Home route
app.get("/", (req, res) => {
  return res.status(200).json({ message: "Hello world from home" });
});

// Job routes
app.use("/jobs", jobRoute);

app.use("/api/resumes", resumeUploadRoutes);

export default app;

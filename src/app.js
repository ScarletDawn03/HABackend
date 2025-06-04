import express from "express";
import cors from "cors";
import jobRoute from "./routes/job.route.js";
import resumeUploadRoutes from "./routes/resumeUpload.js";
import authRoutes from './routes/auth.route.js';
import messagesRoute from './routes/messages.route.js';
import scheduleRoute from './routes/schedule.route.js';
import applicationRoute from './routes/application.route.js';
import sessionMiddleware from './middleware/session.middleware.js';
import calendarRoutes from './routes/calendar.route.js';
import verificationRoutes from './routes/verification.route.js';





const app = express();

app.use(cors({
  origin: 'http://localhost:5173',  // your frontend origin
  credentials: true,                // allow credentials (cookies)
}));

app.use(express.json());

app.use(sessionMiddleware);

// Home route
app.get("/", (req, res) => {
  return res.status(200).json({ message: "Hello world from home" });
});

app.use('/', authRoutes);

// Job routes
app.use("/jobs", jobRoute);

app.use("/api/resumes", resumeUploadRoutes);

app.use('/messages', messagesRoute);

app.use('/applications', applicationRoute);

app.use('/schedules', scheduleRoute);

app.use('/calendar', calendarRoutes);

app.use('/verification', verificationRoutes);


export default app;

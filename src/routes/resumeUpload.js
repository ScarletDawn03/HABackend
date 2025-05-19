// src/routes/resumeUpload.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Set up storage engine for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/resumes';
    fs.mkdirSync(uploadPath, { recursive: true }); // create folder if it doesn't exist
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const sanitized = file.originalname.replace(/\s+/g, '_');
    cb(null, `${timestamp}_${sanitized}`);
  }
});

const upload = multer({ storage });

// POST route to upload resume
router.post('/upload', upload.array('resumes'), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded.' });
  }

  res.status(200).json({
    message: 'Resumes uploaded successfully',
    files: req.files.map(f => f.filename),
  });
});

export default router;
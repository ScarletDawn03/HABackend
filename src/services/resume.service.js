import express from 'express';
import multer from 'multer';
import { Readable } from 'stream';
import { getGridFSBucket } from '../utils/gridfs.js';

const router = express.Router();

// Multer: in-memory storage and PDF + 5MB check
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files allowed'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

// POST /upload - stream resumes to GridFS
router.post('/upload', upload.array('resumes'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const bucket = getGridFSBucket();
    const uploadedFiles = [];

    await Promise.all(
      req.files.map((file) => {
        return new Promise((resolve, reject) => {
          const stream = new Readable();
          stream.push(file.buffer);
          stream.push(null);

          const uploadStream = bucket.openUploadStream(file.originalname, {
            contentType: file.mimetype,
          });

          stream.pipe(uploadStream)
            .on('error', reject)
            .on('finish', (uploadedFile) => {
              uploadedFiles.push(uploadedFile._id);
              resolve();
            });
        });
      })
    );

    res.status(200).json({
      message: 'Resumes uploaded successfully to GridFS',
      fileIds: uploadedFiles,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /resume/:id - download resume from GridFS
import mongoose from 'mongoose';

router.get('/resume/:id', (req, res) => {
  try {
    const bucket = getGridFSBucket();
    const fileId = new mongoose.Types.ObjectId(req.params.id);

    const downloadStream = bucket.openDownloadStream(fileId);

    downloadStream.on('file', (file) => {
      res.setHeader('Content-Type', file.contentType);
      res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);
    });

    downloadStream.on('error', () => {
      res.status(404).json({ message: 'Resume not found' });
    });

    downloadStream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

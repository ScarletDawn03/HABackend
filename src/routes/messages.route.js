import express from 'express';
import { downloadAttachment, syncGmailMessages, getDbMessage } from '../controllers/messages.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// Use the Google auth middleware for all routes here
router.use(requireAuth);  

router.get('/download-attachment',downloadAttachment);
router.get('/sync-messages',syncGmailMessages);
router.get('/db-messages', getDbMessage);

export default router;

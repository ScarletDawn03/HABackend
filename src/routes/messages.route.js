import express from 'express';
import { downloadAttachment, syncGmailMessages, getDbMessage, sendEmail } from '../controllers/messages.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
// Use the Google auth middleware for all routes here
router.use(requireAuth);  

router.get('/download-attachment',downloadAttachment);
router.get('/sync-messages',syncGmailMessages);
router.get('/db-messages', getDbMessage);
router.post('/send', upload.array('attachments'), sendEmail);

export default router;

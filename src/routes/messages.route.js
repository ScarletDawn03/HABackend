import express from 'express';
import { downloadAttachment, syncGmailMessages, syncGmailSentMessages, getDbMessage, sendEmail, replyToEmail, deleteMessageController  } from '../controllers/messages.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(requireAuth);  

router.get('/download-attachment',downloadAttachment);
router.get('/sync-messages',syncGmailMessages);
router.get('/sync-sent-messages', syncGmailSentMessages);
router.get('/db-messages', getDbMessage);
router.post('/send', upload.array('attachments'), sendEmail);
router.post('/reply-to', upload.array('attachments'), replyToEmail);
router.delete('/delete/:id', deleteMessageController);

export default router;

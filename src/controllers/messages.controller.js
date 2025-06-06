// src/controllers/messages.controller.js
import { syncMessagesForUser, syncSentMessagesForUser,  sendEmailViaGmail, replyToEmailViaGmail} from '../services/gmail.service.js';
import { getDbMessagesByUserEmail,downloadAttachmentForUser, deleteMessageById  } from '../services/message.service.js';
import User from '../models/user.model.js';
import Message from '../models/message.model.js';
import mongoose from 'mongoose';

// Constants
const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized',
  INVALID_EMAIL_FORMAT: 'Invalid receiverEmail format',
  INVALID_EMAIL_ARRAY: 'receiverEmail must be an array of email addresses',
  NO_VALID_EMAILS: 'No valid email addresses provided',
  MESSAGE_NOT_FOUND: 'Original message not found',
  INVALID_MESSAGE_ID: 'Invalid message ID format',
  MESSAGES_NOT_FOUND: 'Message(s) not found or unauthorized',
  NO_MESSAGES_DELETED: 'No messages were deleted'
};

// Middleware-like functions
function validateUserSession(session) {
  return session?.userEmail;
}

function validateEmailArray(emails) {
  try {
    const parsedEmails = typeof emails === 'string' ? JSON.parse(emails) : emails;
    if (!Array.isArray(parsedEmails)) return null;
    return parsedEmails.filter(email => 
      typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    );
  } catch (e) {
    return null;
  }
}

function processAttachments(files) {
  return files?.map((file) => ({
    filename: file.originalname,
    path: file.path,
    buffer: file.buffer,
  })) || [];
}

// Controller Functions
export async function syncGmailMessages(req, res) {
  try {
    const userEmail = validateUserSession(req.session);
    if (!userEmail) return res.status(401).json({ error: ERROR_MESSAGES.UNAUTHORIZED });

    const result = await syncMessagesForUser(userEmail);
    res.json(result);
  } catch (error) {
    console.error('Error in syncGmailMessages:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function syncGmailSentMessages(req, res) {
  try {
    const userEmail = validateUserSession(req.session);
    if (!userEmail) return res.status(401).json({ error: ERROR_MESSAGES.UNAUTHORIZED });

    const result = await syncSentMessagesForUser(userEmail);
    res.json(result);
  } catch (error) {
    console.error('Error in syncGmailSentMessages:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function downloadAttachment(req, res) {
  try {
    const { messageId, attachmentId, filename } = req.query;
    const userEmail = validateUserSession(req.session);

    if (!userEmail || !messageId || !attachmentId) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const user = await User.findOne({ email: userEmail });
    if (!user) return res.status(401).json({ error: ERROR_MESSAGES.UNAUTHORIZED });

    const buffer = await downloadAttachmentForUser(user, messageId, attachmentId);

    res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
    res.setHeader("Content-Type", "application/octet-stream");
    res.send(buffer);
  } catch (error) {
    console.error("Error downloading attachment:", error);
    res.status(500).json({ error: "Failed to download attachment" });
  }
}

export async function getDbMessage(req, res) {
  try {
    const userEmail = validateUserSession(req.session);
    if (!userEmail) return res.status(401).json({ error: ERROR_MESSAGES.UNAUTHORIZED });

    const messages = await getDbMessagesByUserEmail(userEmail);
    res.json(messages);
  } catch (error) {
    console.error("Error in getDbMessage controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function sendEmail(req, res) {
  try {
    const userEmail = validateUserSession(req.session);
    if (!userEmail) return res.status(401).json({ error: ERROR_MESSAGES.UNAUTHORIZED });

    const validEmails = validateEmailArray(req.body.receiverEmail);
    if (!validEmails) return res.status(400).json({ message: ERROR_MESSAGES.INVALID_EMAIL_FORMAT });
    if (validEmails.length === 0) return res.status(400).json({ message: ERROR_MESSAGES.NO_VALID_EMAILS });

    const attachments = processAttachments(req.files);
    const result = await sendEmailViaGmail(
      userEmail,
      validEmails,
      req.body.subject,
      req.body.content,
      attachments
    );

    res.status(200).json({ message: 'Email sent', data: result });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ message: 'Failed to send email', error: error.message });
  }
}

export async function replyToEmail(req, res) {
  try {
    const userEmail = validateUserSession(req.session);
    if (!userEmail) return res.status(401).json({ error: 'Unauthorized: No logged-in user' });

    const requiredFields = ['originalMessageId', 'bodyText', 'to', 'subject', 'replyToMessageId', 'threadId'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        missingFields 
      });
    }

    const originalMsg = await Message.findOne({
      accountEmail: userEmail,
      messageId: req.body.originalMessageId,
    });
    if (!originalMsg) return res.status(404).json({ error: ERROR_MESSAGES.MESSAGE_NOT_FOUND });

    const finalSubject = originalMsg.subject.startsWith('Re:')
      ? originalMsg.subject
      : `Re: ${originalMsg.subject}`;

    await replyToEmailViaGmail({
      senderEmail: userEmail,
      recipientEmail: req.body.to,
      subject: finalSubject,
      bodyText: req.body.bodyText,
      replyToMessageId: req.body.replyToMessageId,
      threadId: req.body.threadId,
      attachments: req.files,
    });

    res.status(200).json({ success: true, message: 'Reply sent successfully' });
  } catch (error) {
    console.error("Error in replyToEmail:", error);
    res.status(500).json({ error: 'Failed to send reply' });
  }
}

export async function deleteMessageController(req, res) {
  try {
    const userEmail = validateUserSession(req.session);
    if (!userEmail) return res.status(401).json({ error: ERROR_MESSAGES.UNAUTHORIZED });

    const { id } = req.params;
    const isThreadDelete = req.query.byThreadId === "true";

    if (!isThreadDelete && !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: ERROR_MESSAGES.INVALID_MESSAGE_ID });
    }

    const filter = isThreadDelete
      ? { threadId: id, accountEmail: userEmail }
      : { _id: id, accountEmail: userEmail };

    const message = await Message.findOne(filter);
    if (!message) return res.status(404).json({ error: ERROR_MESSAGES.MESSAGES_NOT_FOUND });

    const deletedCount = await deleteMessageById(id, isThreadDelete, userEmail);
    if (deletedCount === 0) return res.status(500).json({ error: ERROR_MESSAGES.NO_MESSAGES_DELETED });

    res.status(200).json({ message: `Deleted ${deletedCount} message(s) successfully.` });
  } catch (error) {
    console.error("Error deleting message(s):", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
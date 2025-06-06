import { syncMessagesForUser, sendEmailViaGmail, replyToEmailViaGmail, syncSentMessagesForUser } from '../services/gmail.service.js';
import { getDbMessagesByUserEmail,downloadAttachmentForUser, deleteMessageById  } from '../services/message.service.js';
import User from '../models/User.model.js';
import Message from '../models/message.model.js';
import mongoose from 'mongoose';



export async function syncGmailMessages(req, res) {
  try {
    const userEmail = req.session?.userEmail;
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await syncMessagesForUser(userEmail);
    res.json(result);
  } catch (error) {
    console.error('Error in syncGmailMessages:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function syncGmailSentMessages(req, res) {
  try {
    const userEmail = req.session?.userEmail;
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await syncSentMessagesForUser(userEmail);
    res.json(result);
  } catch (error) {
    console.error('Error in syncGmailSentMessages:', error);
    res.status(500).json({ error: error.message });
  }
}


export async function downloadAttachment(req, res) {
  const { messageId, attachmentId, filename } = req.query;
  const userEmail = req.session?.userEmail;

  if (!userEmail || !messageId || !attachmentId) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    // Fetch user with tokens from DB
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Pass full user object, including tokens, to service
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
    const userEmail = req.session?.userEmail;
    if (!userEmail) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const messages = await getDbMessagesByUserEmail(userEmail);
    res.json(messages);
  } catch (error) {
    console.error("Error in getDbMessage controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function sendEmail(req, res) {
  try {
    const userEmail = req.session?.userEmail;
    let { receiverEmail, subject, content } = req.body;

    // Parse receiverEmail if it's a JSON string (e.g., from FormData)
    try {
      if (typeof receiverEmail === 'string') {
        receiverEmail = JSON.parse(receiverEmail);
      }
    } catch (e) {
      return res.status(400).json({ message: 'Invalid receiverEmail format' });
    }

    // Ensure it's an array
    if (!Array.isArray(receiverEmail)) {
      return res.status(400).json({ message: 'receiverEmail must be an array of email addresses' });
    }

    // Validate emails
    const validEmails = receiverEmail.filter(email =>
      typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    );
    if (validEmails.length === 0) {
      return res.status(400).json({ message: 'No valid email addresses provided' });
    }

    // Handle attachments
    const attachments = req.files?.map((file) => ({
      filename: file.originalname,
      path: file.path,
      buffer: file.buffer,
    })) || [];

    console.log('Sending to:', validEmails);
    console.log('Attachments:', attachments.map(f => f.filename));

    const result = await sendEmailViaGmail(
      userEmail,
      validEmails,
      subject,
      content,
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
    console.log("Incoming /messages/reply-to request");
    console.log("Request body:", req.body);
    console.log("Attachments:", req.files);

    const { originalMessageId, bodyText, to, subject, replyToMessageId, threadId } = req.body;
    const senderEmail = req.session.userEmail;

    if (!senderEmail) {
      return res.status(401).json({ error: 'Unauthorized: No logged-in user' });
    }

    if (!originalMessageId || !to || !subject || !bodyText || !replyToMessageId || !threadId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const originalMsg = await Message.findOne({
      accountEmail: senderEmail,
      messageId: originalMessageId,
    });

    if (!originalMsg) {
      return res.status(404).json({ error: 'Original message not found' });
    }

    const finalSubject = originalMsg.subject.startsWith('Re:')
      ? originalMsg.subject
      : `Re: ${originalMsg.subject}`;

    await replyToEmailViaGmail({
      senderEmail,   // from session
      recipientEmail: to,
      subject: finalSubject,
      bodyText,
      replyToMessageId,
      threadId,
      attachments: req.files, // multer array
    });

    res.status(200).json({ success: true, message: 'Reply sent successfully' });
  } catch (err) {
    console.error("Error in replyToEmail:", err);
    res.status(500).json({ error: 'Failed to send reply' });
  }
}


/**
 * DELETE /messages/:id?byThreadId=true
 */
export async function deleteMessageController(req, res) {
  const { id } = req.params;
  const { byThreadId } = req.query;
  const userEmail = req.session?.userEmail;

  if (!userEmail) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const isThreadDelete = byThreadId === "true";

  try {
    // Validate ObjectId if deleting by message _id
    if (!isThreadDelete && !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid message ID format" });
    }

    // Step 1: Check existence and ownership
    const filter = isThreadDelete
      ? { threadId: id, accountEmail: userEmail }
      : { _id: id, accountEmail: userEmail };

    const message = await Message.findOne(filter);
    if (!message) {
      return res
        .status(404)
        .json({ error: "Message(s) not found or unauthorized" });
    }

    // Step 2: Delete message(s) - pass userEmail!
    const deletedCount = await deleteMessageById(id, isThreadDelete, userEmail);
    if (deletedCount === 0) {
      return res.status(500).json({ error: "No messages were deleted" });
    }

    return res
      .status(200)
      .json({ message: `Deleted ${deletedCount} message(s) successfully.` });
  } catch (error) {
    console.error("Error deleting message(s):", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

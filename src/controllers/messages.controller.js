import { syncMessagesForUser, sendEmailViaGmail } from '../services/gmail.service.js';
import { getDbMessagesByUserEmail,downloadAttachmentForUser, deleteMessageById  } from '../services/message.service.js';
import User from '../models/User.model.js';
import Message from '../models/message.model.js';




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
    const { receiverEmail, subject, content } = req.body;

    // If using file uploads via multer
    const attachments = req.files?.map((file) => ({
      filename: file.originalname,
      path: file.path,
    })) || [];

    if (!userEmail || !receiverEmail || !subject || !content) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const result = await sendEmailViaGmail(
      userEmail,
      receiverEmail,
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


/**
 * DELETE /api/messages/:id?byMessageId=true
 */
export async function deleteMessageController(req, res) {
  const { id } = req.params;
  const { byMessageId } = req.query;
  const userEmail = req.session?.userEmail;

  if (!userEmail) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Step 1: Ensure the message exists and belongs to the user
    const filter = byMessageId === 'true'
      ? { messageId: id, accountEmail: userEmail }
      : { _id: id, accountEmail: userEmail };

    const message = await Message.findOne(filter);
    if (!message) {
      return res.status(404).json({ error: 'Message not found or unauthorized' });
    }

    // Step 2: Delete the message
    const deleted = await deleteMessageById(id, byMessageId === 'true');
    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete message' });
    }

    return res.status(200).json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
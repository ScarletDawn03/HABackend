import { syncMessagesForUser } from '../services/gmail.service.js';
import { getDbMessagesByUserEmail,downloadAttachmentForUser } from '../services/message.service.js';
import User from '../models/User.model.js';


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
import Message from "../models/message.model.js";
import { google } from 'googleapis';

function createOAuthClientForUser(user) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: user.accessToken,
    refresh_token: user.refreshToken,
  });

  oauth2Client.on('tokens', async (tokens) => {
    // Only update if tokens are new
    let updated = false;
    if (tokens.refresh_token && tokens.refresh_token !== user.refreshToken) {
      user.refreshToken = tokens.refresh_token;
      updated = true;
    }
    if (tokens.access_token && tokens.access_token !== user.accessToken) {
      user.accessToken = tokens.access_token;
      updated = true;
    }
    if (updated) {
      try {
        await user.save();
      } catch (err) {
        console.error("Error saving updated tokens for user:", err);
      }
    }
  });

  return oauth2Client;
}

export async function getDbMessagesByUserEmail(userEmail) {
  return await Message.find({ accountEmail: userEmail }).sort({ receivedAt: -1 });
}

export async function downloadAttachmentForUser(user, messageId, attachmentId) {
  const oauth2Client = createOAuthClientForUser(user);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const attachment = await gmail.users.messages.attachments.get({
    userId: 'me',
    messageId,
    id: attachmentId,
  });

  return Buffer.from(attachment.data.data, 'base64');
}

export async function deleteMessageById(id, isThread = false, userEmail) {
  try {
    if (isThread) {
      const result = await Message.deleteMany({
        threadId: id,
        accountEmail: userEmail,
      });
      return result.deletedCount;
    } else {
      const result = await Message.deleteOne({
        _id: id,
        accountEmail: userEmail,
      });
      return result.deletedCount;
    }
  } catch (err) {
    console.error("Error deleting message(s) in service:", err);
    throw err;
  }
}
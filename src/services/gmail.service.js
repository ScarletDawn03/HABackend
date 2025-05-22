import { google } from 'googleapis';
import Message from '../models/message.model.js';
import User from '../models/User.model.js'; // Make sure you have this

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

async function setUserCredentials(user) {
  oauth2Client.setCredentials({
    access_token: user.accessToken,
    refresh_token: user.refreshToken,
  });

  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) user.refreshToken = tokens.refresh_token;
    if (tokens.access_token) user.accessToken = tokens.access_token;
    await user.save();
  });
}

function parseMessagePayload(payload) {
  const headers = payload.headers || [];
  const getHeader = (name) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
  const from = getHeader('From');
  const subject = getHeader('Subject');

  let body = '';
  const parts = payload.parts || [payload];
  for (const part of parts) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      body = Buffer.from(part.body.data, 'base64').toString('utf8');
      break;
    }
  }

  const attachments = [];
  for (const part of parts) {
    if (part.filename && part.body?.attachmentId) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType,
        attachmentId: part.body.attachmentId,
      });
    }
  }

  return { from, subject, body, attachments };
}
export async function syncMessagesForUser(userEmail, maxResults = 3) {
  if (!userEmail) {
    throw new Error('Unauthorized - No userEmail provided');
  }

  const user = await User.findOne({ email: userEmail });
  if (!user) {
    throw new Error('User not found');
  }

  await setUserCredentials(user);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Case 1: Initial sync
  if (!user.lastHistoryId) {
    const messagesListRes = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      labelIds: ['CATEGORY_PERSONAL'],
    });

    const messages = messagesListRes.data.messages || [];
    const historyId = messagesListRes.data.historyId;

    const detailedMessages = await Promise.all(
      messages.map(async (msg) => {
        const msgData = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full',
        });

         if (!msgData.data.labelIds?.includes('CATEGORY_PERSONAL')) {
      return null;
    }

        const { from, subject, body, attachments } = parseMessagePayload(msgData.data.payload);

        await Message.findOneAndUpdate(
          { accountEmail: userEmail, messageId: msg.id },
          {
            accountEmail: userEmail,
            from,
            subject,
            body: body || msgData.data.snippet,
            threadId: msgData.data.threadId,
            messageId: msg.id,
            attachments,
            receivedAt: new Date(Number(msgData.data.internalDate) || Date.now()),
          },
          { upsert: true, new: true }
        );

        return { messageId: msg.id, threadId: msgData.data.threadId, from, subject, body, attachments };
      })
    );

    const filteredMessages = detailedMessages.filter(Boolean);

    user.lastHistoryId = historyId;
    await user.save();

    return { source: 'initial', messages: filteredMessages };
  }

  // Case 2: Incremental sync
  const historyRes = await gmail.users.history.list({
    userId: 'me',
    startHistoryId: user.lastHistoryId,
    historyTypes: ['messageAdded'],
  });

  const history = historyRes.data.history || [];
  const newMessages = history.flatMap((h) => h.messages || []);

  const detailedMessages = await Promise.all(
    newMessages.map(async (msg) => {
      const msgData = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
      });

      const { from, subject, body, attachments } = parseMessagePayload(msgData.data.payload);

      await Message.findOneAndUpdate(
        { accountEmail: userEmail, messageId: msg.id },
        {
          accountEmail: userEmail,
          from,
          subject,
          body: body || msgData.data.snippet,
          threadId: msgData.data.threadId,
          messageId: msg.id,
          attachments,
          receivedAt: new Date(Number(msgData.data.internalDate) || Date.now()),
        },
        { upsert: true, new: true }
      );

      return { messageId: msg.id, threadId: msgData.data.threadId, from, subject, body, attachments };
    })
  );

  if (historyRes.data.historyId) {
    user.lastHistoryId = historyRes.data.historyId;
    await user.save();
  }

  return { source: 'incremental', messages: detailedMessages };
}


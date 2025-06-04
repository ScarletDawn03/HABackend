import { google } from 'googleapis';
import Message from '../models/message.model.js';
import User from '../models/User.model.js'; // Make sure you have this

import fs from 'fs/promises';
import path from 'path';
import mime from 'mime-types';


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

  if (!user.syncedMessageIds) {
    user.syncedMessageIds = [];
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

    const messages = (messagesListRes.data.messages || []).filter(
      (msg) => !user.syncedMessageIds.includes(msg.id)
    );

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

        // Track this message ID as synced
        user.syncedMessageIds.push(msg.id);

        return { messageId: msg.id, threadId: msgData.data.threadId, from, subject, body, attachments };
      })
    );

    user.lastHistoryId = historyId;
    await user.save();

    return { source: 'initial', messages: detailedMessages.filter(Boolean) };
  }

  // Case 2: Incremental sync
  const historyRes = await gmail.users.history.list({
    userId: 'me',
    startHistoryId: user.lastHistoryId,
    historyTypes: ['messageAdded'],
  });

  const history = historyRes.data.history || [];
  const newMessages = history.flatMap((h) => h.messages || []);

  const messagesToFetch = newMessages.filter(
    (msg) => !user.syncedMessageIds.includes(msg.id)
  );

  const detailedMessages = await Promise.all(
    messagesToFetch.map(async (msg) => {
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

      // Track this message ID as synced
      user.syncedMessageIds.push(msg.id);

      return { messageId: msg.id, threadId: msgData.data.threadId, from, subject, body, attachments };
    })
  );

  if (historyRes.data.historyId) {
    user.lastHistoryId = historyRes.data.historyId;
  }

  await user.save();

  return { source: 'incremental', messages: detailedMessages.filter(Boolean) };
}

function getGmailClient(accessToken) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

/**
 * Send an email using Gmail API with optional attachments
 * @param {string} senderEmail - The logged-in user's email (used for auth)
 * @param {string} to - Recipient's email address
 * @param {string} subject - Subject of the email
 * @param {string} bodyText - Plain text content
 * @param {Array<{filename: string, path: string}>} attachments - Optional attachments
 */
export async function sendEmailViaGmail(senderEmail, to, subject, bodyText, attachments = []) {
  const user = await User.findOne({ email: senderEmail});
  if (!user) throw new Error('Sender not found');

  await setUserCredentials(user);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Build message body with MIME format
  const boundary = 'my-boundary-42';
  const mimeParts = [];

  // Add the plain text part
  mimeParts.push(
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
    '',
    bodyText
  );

  // Add attachments (if any)
  for (const file of attachments) {
    const fileContent = await fs.readFile(file.path);
    const mimeType = mime.lookup(file.filename) || 'application/octet-stream';
    const base64Content = fileContent.toString('base64');

    mimeParts.push(
      `--${boundary}`,
      `Content-Type: ${mimeType}; name="${file.filename}"`,
      `Content-Disposition: attachment; filename="${file.filename}"`,
      `Content-Transfer-Encoding: base64`,
      '',
      base64Content
    );
  }

  mimeParts.push(`--${boundary}--`);

  const rawMessage = [
    `To: ${to}`,
    `From: ${senderEmail}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    ...mimeParts
  ].join('\r\n');

  const encodedMessage = Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  // Send email
  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });

  return res.data;
}


export async function sendVerificationEmailViaGmail({
  accessToken,
  senderEmail,
  candidateEmail,
  candidateName,
  jobTitle,
  link,
}) {
  const bodyText = `
Hello ${candidateName},

Please verify your interest for the job "${jobTitle}" by completing this short form:
${link}

This link will expire in 48 hours.
`;

  const subject = `Verification Required: ${jobTitle}`;

  const messageParts = [
    `To: ${candidateEmail}`,
    `From: ${senderEmail}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    '',
    bodyText,
  ];

  const rawMessage = messageParts.join('\n');

  const encodedMessage = Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const gmail = getGmailClient(accessToken);

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });
}




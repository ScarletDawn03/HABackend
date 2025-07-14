import { google } from 'googleapis';
import Message from '../models/message.model.js';
import User from '../models/user.model.js';
import RepliedMessage from '../models/repliedMessage.model.js';
import fs from 'fs/promises';
import path from 'path';
import mime from 'mime-types';
import { enhanceEmailTone } from "./vertexHelper.js"

// Constants and Configuration
const EMAIL_TEMPLATE = `
Dear Candidate,

{body}

Best regards,
HR Team
`;

const GMAIL_AUTH_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI
};

// Auth Utilities
const oauth2Client = new google.auth.OAuth2(
  GMAIL_AUTH_CONFIG.clientId,
  GMAIL_AUTH_CONFIG.clientSecret,
  GMAIL_AUTH_CONFIG.redirectUri
);

function getGmailClient(accessToken) {
  const client = new google.auth.OAuth2(
    GMAIL_AUTH_CONFIG.clientId,
    GMAIL_AUTH_CONFIG.clientSecret,
    GMAIL_AUTH_CONFIG.redirectUri
  );
  client.setCredentials({ access_token: accessToken });
  return google.gmail({ version: 'v1', auth: client });
}

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

// Message Processing Utilities
function parseMessagePayload(payload, options = { includeTo: false }) {
  const headers = payload.headers || [];
  const getHeader = (name) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;

  const from = getHeader('From');
  const subject = getHeader('Subject');

  let to = null;
  if (options.includeTo) {
    const rawTo = getHeader('To') || '';
    to = rawTo
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);
  }

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

  const base = { from, subject, body, attachments };
  return options.includeTo ? { ...base, to } : base;
}

async function getMessageIdHeader(gmail, messageId) {
  const msg = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'metadata',
    metadataHeaders: ['Message-ID'],
  });
  const headers = msg.data.payload.headers;
  const messageIdHeader = headers.find(h => h.name.toLowerCase() === 'message-id');
  return messageIdHeader ? messageIdHeader.value : null;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Database Operations
async function saveMessageToDB(userEmail, msgData, messageId) {
  const { from, subject, body, attachments } = parseMessagePayload(msgData.data.payload);

  return Message.findOneAndUpdate(
    { accountEmail: userEmail, messageId },
    {
      accountEmail: userEmail,
      from,
      subject,
      body: body || msgData.data.snippet,
      threadId: msgData.data.threadId,
      messageId,
      attachments,
      receivedAt: new Date(Number(msgData.data.internalDate) || Date.now()),
    },
    { upsert: true, new: true }
  );
}

async function saveRepliedMessageToDB(userEmail, msgId, msgData) {
  const { from, to, subject, body, attachments } = parseMessagePayload(
    msgData.data.payload, 
    { includeTo: true }
  );

  const recipientEmails = Array.isArray(to) ? to : [to].filter(Boolean);

  return RepliedMessage.findOneAndUpdate(
    { accountEmail: userEmail, messageId: msgId },
    {
      accountEmail: userEmail,
      from,
      recipientEmails,
      subject,
      body: body || msgData.data.snippet,
      threadId: msgData.data.threadId,
      messageId: msgId,
      attachments,
      sentAt: new Date(Number(msgData.data.internalDate) || Date.now()),
    },
    { upsert: true, new: true }
  );
}

// Email Construction Utilities
function formatEmailBody(bodyText) {
  return EMAIL_TEMPLATE.replace('{body}', bodyText).trim();
}

async function buildMimeMessage({ 
  senderEmail, 
  recipientEmail, 
  subject, 
  bodyText, 
  attachments = [], 
  replyHeaders = {} 
}) {
  const boundary = "boundary-" + Math.random().toString().substring(2, 10);
  const mimeParts = [];

  // Add plain text part
  mimeParts.push(
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
    "",
    bodyText
  );

  // Process attachments
  const savedAttachments = [];
  for (const file of attachments) {
    let fileContent;
    if (file.buffer) {
      fileContent = file.buffer;
    } else if (file.path) {
      const resolvedPath = path.resolve(file.path);
      fileContent = await fs.readFile(resolvedPath);
    } else {
      throw new Error(`Attachment file content missing for ${file.originalname || file.filename}`);
    }

    const filename = file.originalname || file.filename || "unknown";
    const mimeType = mime.lookup(filename) || "application/octet-stream";
    const base64Content = fileContent.toString("base64");

    mimeParts.push(
      `--${boundary}`,
      `Content-Type: ${mimeType}; name="${filename}"`,
      `Content-Disposition: attachment; filename="${filename}"`,
      `Content-Transfer-Encoding: base64`,
      "",
      base64Content
    );

    savedAttachments.push({
      filename,
      mimeType,
      attachmentId: null,
    });
  }

  mimeParts.push(`--${boundary}--`);

  // Build headers
  const headers = [
    `To: ${recipientEmail}`,
    `From: ${senderEmail}`,
    `Subject: ${subject}`,
    ...Object.entries(replyHeaders).map(([key, value]) => `${key}: ${value}`),
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ""
  ];

  return {
    rawMessage: [...headers, ...mimeParts].join("\r\n"),
    attachments: savedAttachments
  };
}

function encodeMessage(rawMessage) {
  return Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Core Email Functions
export async function syncMessagesForUser(userEmail, maxResults = 3) {
  if (!userEmail) throw new Error('Unauthorized - No userEmail provided');

  const user = await User.findOne({ email: userEmail });
  if (!user) throw new Error('User not found');

  if (!user.syncedMessageIds) user.syncedMessageIds = [];
  await setUserCredentials(user);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Initial sync
  if (!user.lastHistoryId) {
    const messagesListRes = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      labelIds: ['CATEGORY_PERSONAL'],
    });

    const messages = (messagesListRes.data.messages || []).filter(
      (msg) => !user.syncedMessageIds.includes(msg.id)
    );

    const detailedMessages = await Promise.all(
      messages.map(async (msg) => {
        const msgData = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full',
        });

        if (!msgData.data.labelIds?.includes('CATEGORY_PERSONAL')) return null;

        await saveMessageToDB(userEmail, msgData, msg.id);
        user.syncedMessageIds.push(msg.id);

        const { from, subject, body, attachments } = parseMessagePayload(msgData.data.payload);
        return { messageId: msg.id, threadId: msgData.data.threadId, from, subject, body, attachments };
      })
    );

    user.lastHistoryId = messagesListRes.data.historyId;
    await user.save();
    return { source: 'initial', messages: detailedMessages.filter(Boolean) };
  }

  // Incremental sync
  const historyRes = await gmail.users.history.list({
    userId: 'me',
    startHistoryId: user.lastHistoryId,
    historyTypes: ['messageAdded'],
  });

  const newMessages = (historyRes.data.history || []).flatMap((h) => h.messages || []);
  const messagesToFetch = newMessages.filter((msg) => !user.syncedMessageIds.includes(msg.id));

  const detailedMessages = await Promise.all(
    messagesToFetch.map(async (msg) => {
      const msgData = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
      });

      await saveMessageToDB(userEmail, msgData, msg.id);
      user.syncedMessageIds.push(msg.id);

      const { from, subject, body, attachments } = parseMessagePayload(msgData.data.payload);
      return { messageId: msg.id, threadId: msgData.data.threadId, from, subject, body, attachments };
    })
  );

  if (historyRes.data.historyId) {
    user.lastHistoryId = historyRes.data.historyId;
  }

  await user.save();
  return { source: 'incremental', messages: detailedMessages.filter(Boolean) };
}

export async function syncSentMessagesForUser(userEmail, maxResults = 3) {
  if (!userEmail) throw new Error('Unauthorized - No userEmail provided');

  const user = await User.findOne({ email: userEmail });
  if (!user) throw new Error('User not found');

  if (!user.syncedSentMessageIds) user.syncedSentMessageIds = [];
  await setUserCredentials(user);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Initial sync
  if (!user.lastSentHistoryId) {
    const messagesListRes = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      labelIds: ['SENT'],
    });

    const messages = (messagesListRes.data.messages || []).filter(
      (msg) => !user.syncedSentMessageIds.includes(msg.id)
    );

    const detailedMessages = await Promise.all(
      messages.map(async (msg) => {
        const msgData = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full',
        });

        if (!msgData.data.labelIds?.includes('SENT')) return null;
        
        await saveRepliedMessageToDB(userEmail, msg.id, msgData);
        user.syncedSentMessageIds.push(msg.id);

        const { from, to, subject, body, attachments } = parseMessagePayload(
          msgData.data.payload, 
          { includeTo: true }
        );
        
        return {
          messageId: msg.id,
          threadId: msgData.data.threadId,
          from,
          recipientEmails: Array.isArray(to) ? to : [to].filter(Boolean),
          subject,
          body,
          attachments,
        };
      })
    );

    user.lastSentHistoryId = messagesListRes.data.historyId;
    await user.save();
    return { source: 'initial', messages: detailedMessages.filter(Boolean) };
  }

  // Incremental sync
  const historyRes = await gmail.users.history.list({
    userId: 'me',
    startHistoryId: user.lastSentHistoryId,
    historyTypes: ['messageAdded'],
  });

  const newMessages = (historyRes.data.history || []).flatMap((h) => h.messages || []);
  const messagesToFetch = newMessages.filter((msg) => !user.syncedSentMessageIds.includes(msg.id));

  const detailedMessages = await Promise.all(
    messagesToFetch.map(async (msg) => {
      const msgData = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
      });

      await saveRepliedMessageToDB(userEmail, msg.id, msgData);
      user.syncedSentMessageIds.push(msg.id);

      const { from, to, subject, body, attachments } = parseMessagePayload(
        msgData.data.payload, 
        { includeTo: true }
      );
      
      return {
        messageId: msg.id,
        threadId: msgData.data.threadId,
        from,
        recipientEmails: Array.isArray(to) ? to : [to].filter(Boolean),
        subject,
        body,
        attachments,
      };
    })
  );

  if (historyRes.data.historyId) {
    user.lastSentHistoryId = historyRes.data.historyId;
  }

  await user.save();
  return { source: 'incremental', messages: detailedMessages.filter(Boolean) };
}

export async function sendEmailViaGmail(senderEmail, to, subject, bodyText, attachments = []) {
  const user = await User.findOne({ email: senderEmail });
  if (!user) throw new Error("Sender not found");

  await setUserCredentials(user);
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const recipients = Array.isArray(to) ? to : [to];
  for (const email of recipients) {
    if (!isValidEmail(email)) throw new Error(`Invalid recipient email: ${email}`);
  }

  const enhancedText = await enhanceEmailTone(bodyText);
  const formattedBody = formatEmailBody(enhancedText);
  const { rawMessage, attachments: savedAttachments } = await buildMimeMessage({
    senderEmail,
    recipientEmail: recipients.join(", "),
    subject,
    bodyText: formattedBody,
    attachments
  });

  const encodedMessage = encodeMessage(rawMessage);
  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encodedMessage },
  });

  await RepliedMessage.create({
    accountEmail: senderEmail,
    from: senderEmail,
    to: recipients,
    subject,
    body: formattedBody,
    messageId: res.data.id,
    threadId: res.data.threadId,
    direction: "sent",
    attachments: savedAttachments,
    sentAt: new Date(),
  });

  return res.data;
}

export async function replyToEmailViaGmail({
  senderEmail,
  recipientEmail,
  subject,
  bodyText,
  replyToMessageId,
  threadId,
  attachments = [],
}) {
  const user = await User.findOne({ email: senderEmail });
  if (!user) throw new Error("Sender not found");

  await setUserCredentials(user);
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const originalMessageIdHeader = await getMessageIdHeader(gmail, replyToMessageId);
  if (!originalMessageIdHeader) {
    throw new Error("Original message Message-ID header not found");
  }

  const formattedBody = formatEmailBody(bodyText);
  const { rawMessage, attachments: savedAttachments } = await buildMimeMessage({
    senderEmail,
    recipientEmail,
    subject,
    bodyText: formattedBody,
    attachments,
    replyHeaders: {
      'In-Reply-To': originalMessageIdHeader,
      'References': originalMessageIdHeader
    }
  });

  const encodedMessage = encodeMessage(rawMessage);
  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedMessage,
      threadId,
    },
  });

  await RepliedMessage.create({
    accountEmail: senderEmail,
    from: senderEmail,
    to: recipientEmail,
    subject,
    body: formattedBody,
    messageId: res.data.id,
    threadId,
    inReplyTo: originalMessageIdHeader,
    direction: "sent",
    attachments: savedAttachments,
    sentAt: new Date(),
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
  const bodyText = formatEmailBody(`
${candidateName}, please verify your interest for the job ${jobTitle} by completing this short form:
${link}

This link will expire in 48 hours.
`);

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
  const encodedMessage = encodeMessage(rawMessage);
  const gmail = getGmailClient(accessToken);

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });
}
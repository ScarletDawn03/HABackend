import { google } from 'googleapis';
import Message from '../models/message.model.js';
import User from '../models/User.model.js'; // Make sure you have this
import RepliedMessage from '../models/repliedMessage.model.js';


import fs from 'fs/promises';
import path from 'path';
import mime from 'mime-types';


const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);


function getGmailClient(accessToken) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.gmail({ version: 'v1', auth: oauth2Client });
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
      .filter(Boolean); // Always returns an array or empty
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

export async function syncSentMessagesForUser(userEmail, maxResults = 3) {
  if (!userEmail) throw new Error('Unauthorized - No userEmail provided');

  const user = await User.findOne({ email: userEmail });
  if (!user) throw new Error('User not found');

  if (!user.syncedSentMessageIds) user.syncedSentMessageIds = [];

  await setUserCredentials(user);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const saveRepliedMessage = async (msgId, msgData) => {
   const { from, to, subject, body, attachments } = parseMessagePayload(msgData.data.payload, { includeTo: true });

  const recipientEmails = Array.isArray(to) ? to : [to].filter(Boolean);


    await RepliedMessage.findOneAndUpdate(
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

    user.syncedSentMessageIds.push(msgId);

    return {
      messageId: msgId,
      threadId: msgData.data.threadId,
      from,
      recipientEmails,
      subject,
      body,
      attachments,
    };
  };

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

    const historyId = messagesListRes.data.historyId;

    const detailedMessages = await Promise.all(
      messages.map(async (msg) => {
        const msgData = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full',
        });

        if (!msgData.data.labelIds?.includes('SENT')) return null;
        return await saveRepliedMessage(msg.id, msgData);
      })
    );

    user.lastSentHistoryId = historyId;
    await user.save();

    return { source: 'initial', messages: detailedMessages.filter(Boolean) };
  }

  // Incremental sync
  const historyRes = await gmail.users.history.list({
    userId: 'me',
    startHistoryId: user.lastSentHistoryId,
    historyTypes: ['messageAdded'],
  });

  const history = historyRes.data.history || [];
  const newMessages = history.flatMap((h) => h.messages || []);

  const messagesToFetch = newMessages.filter(
    (msg) => !user.syncedSentMessageIds.includes(msg.id)
  );

  const detailedMessages = await Promise.all(
    messagesToFetch.map(async (msg) => {
      const msgData = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
      });
      return await saveRepliedMessage(msg.id, msgData);
    })
  );

  if (historyRes.data.historyId) {
    user.lastSentHistoryId = historyRes.data.historyId;
  }

  await user.save();

  return { source: 'incremental', messages: detailedMessages.filter(Boolean) };
}




export async function sendEmailViaGmail(senderEmail, to, subject, bodyText, attachments = []) {
  // Find the user and set OAuth2 credentials
  const user = await User.findOne({ email: senderEmail });
  if (!user) throw new Error("Sender not found");

  await setUserCredentials(user);
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const boundary = "my-boundary-42";
  const mimeParts = [];

  // Format email body with your template
  const formattedBody = `
Dear Candidate,

${bodyText}

Best regards,
HR Team
`;

  // Add plain text part
  mimeParts.push(
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
    "",
    formattedBody
  );

  // Array to hold metadata of attachments for DB
  const savedAttachments = [];

  // Process each attachment
  for (const file of attachments) {
    let fileContent;

    if (file.buffer) {
      fileContent = file.buffer;
    } else if (file.path) {
      const resolvedPath = path.resolve(file.path);
      fileContent = await fs.readFile(resolvedPath);
    } else {
      throw new Error(`No file content found for attachment: ${file.filename || file.originalname}`);
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
      attachmentId: null, // You can update if you want to track attachment IDs
    });
  }

  // Close MIME boundary
  mimeParts.push(`--${boundary}--`);

  // Build the raw message string
  const rawMessage = [
    `To: ${to}`,
    `From: ${senderEmail}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    ...mimeParts,
  ].join("\r\n");

  // Encode message for Gmail API (base64url)
  const encodedMessage = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // Send the email via Gmail API
  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encodedMessage },
  });

  const gmailMessageId = res.data.id;
  const gmailThreadId = res.data.threadId;

  // Save sent email to your DB with new schema
  await RepliedMessage.create({
    accountEmail: senderEmail,
    from: senderEmail,
    to,
    subject,
    body: formattedBody,
    messageId: gmailMessageId,
    threadId: gmailThreadId,
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

  // Get original Message-ID header for threading
  const originalMessageIdHeader = await getMessageIdHeader(gmail, replyToMessageId);
  if (!originalMessageIdHeader) {
    throw new Error("Original message Message-ID header not found");
  }

  // Format email body with your template
  const formattedBody = `
Dear Candidate,

${bodyText}

Best regards,
HR Team
`.trim();

  const boundary = "reply-boundary-42";
  const mimeParts = [];

  // Add plain text part
  mimeParts.push(
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
    "",
    formattedBody
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

  // Build the raw MIME message string
  const rawMessage = [
    `To: ${recipientEmail}`,
    `From: ${senderEmail}`,
    `Subject: ${subject}`,
    `In-Reply-To: ${originalMessageIdHeader}`,
    `References: ${originalMessageIdHeader}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    ...mimeParts,
  ].join("\r\n");

  // Encode raw message in base64url format
  const encodedMessage = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // Send reply via Gmail API
  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedMessage,
      threadId,
    },
  });

  // Save sent reply in DB with new schema
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

  console.log("Reply sent and saved. Gmail threadId:", res.data.threadId);

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

Please verify your interest for the job ${jobTitle} by completing this short form:
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





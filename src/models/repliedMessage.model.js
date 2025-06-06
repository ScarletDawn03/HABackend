import mongoose from 'mongoose';

const AttachmentSchema = new mongoose.Schema({
  filename: String,
  mimeType: String,
  size: Number,
  attachmentId: String,       // Match inbox model
  driveFileId: String,
  downloadUrl: String,
}, { _id: false });

const RepliedMessageSchema = new mongoose.Schema({
  accountEmail: { type: String, required: true },       // Sender's (HR's) email, same as inbox
  from: { type: String, required: true },               // Explicit sender email, same as inbox
  recipientEmails: [{ type: String, required: true }],                // Recipient (candidate)
  subject: String,
  body: String,                                         // Match inbox field
  threadId: { type: String, required: true },
  messageId: { type: String, required: true },          // Gmail's message ID
  replyToMessageId: String,                             // Original message ID
  attachments: [AttachmentSchema],
  sentAt: { type: Date, default: Date.now },
}, { timestamps: true });

RepliedMessageSchema.index({ accountEmail: 1, messageId: 1 }, { unique: true });

export default mongoose.model('RepliedMessage', RepliedMessageSchema);

import mongoose from 'mongoose';

const AttachmentSchema = new mongoose.Schema({
  filename: String,
  mimeType: String,
  attachmentId: String,
}, { _id: false });

const MessageSchema = new mongoose.Schema({
  accountEmail: { type: String, required: true },  // OAuth account
  from: { type: String, required: true },          // Sender of the email
  subject: String,
  body: String,
  threadId: { type: String, required: true },
  messageId: { type: String, required: true },
  attachments: [AttachmentSchema],
  receivedAt: { type: Date },                      // Optional timestamp
}, { timestamps: true });

MessageSchema.index({ accountEmail: 1, messageId: 1 }, { unique: true });

export default mongoose.model('Message', MessageSchema);

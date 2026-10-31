import mongoose from 'mongoose';

const passwordResetTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true, strict: 'throw', bufferCommands: false },
);

passwordResetTokenSchema.index({ userId: 1 }, { unique: true });

export const PasswordResetToken =
  mongoose.models.PasswordResetToken ||
  mongoose.model('PasswordResetToken', passwordResetTokenSchema);

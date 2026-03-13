import mongoose from 'mongoose';

const BlockSchema = new mongoose.Schema(
  {
    blockerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    blockedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    source: {
      type: String,
      enum: ['after_call', 'in_call', 'other'],
      default: 'other',
    },
    status: {
      type: String,
      enum: ['pending_review'],
      default: 'pending_review',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicates: one block request per pair
BlockSchema.index({ blockerId: 1, blockedUserId: 1 }, { unique: true });
BlockSchema.index({ blockedUserId: 1, createdAt: -1 });

// Auto-expire block entries after 24 hours (daily reset)
BlockSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export const Block = mongoose.model('Block', BlockSchema);

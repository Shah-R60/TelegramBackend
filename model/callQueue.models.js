import mongoose from 'mongoose';

const CallQueueSchema = new mongoose.Schema({
     user_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
     },
     status: {
          type: String,
          enum: ['waiting', 'matched'],
          default: 'waiting',
     },
     matched_with: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          default: null,
     },
     call_id: {
          type: String,
          default: null,
     },
}, {
     timestamps: true,
});

// Index for faster queries
CallQueueSchema.index({ user_id: 1 });
CallQueueSchema.index({ status: 1, createdAt: 1 });

// Auto-expire entries after 5 minutes
CallQueueSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 });

export const CallQueue = mongoose.model('CallQueue', CallQueueSchema);

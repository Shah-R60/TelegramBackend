import mongoose from 'mongoose';

const ReportSchema = new mongoose.Schema({
     reporterId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
     },
     reportedUserId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
     },
     reason: {
          type: String,
          enum: ['harassment', 'abuse', 'spam', 'inappropriate', 'other'],
          required: true
     },
     actionTaken: {
          type: String,
          enum: ['none', 'warning', '24h_ban', '7d_ban'],
          default: 'none'
     }
}, {
     timestamps: true
});

// Index for faster queries
ReportSchema.index({ reportedUserId: 1, createdAt: -1 });
ReportSchema.index({ reporterId: 1, createdAt: -1 });

export const Report = mongoose.model('Report', ReportSchema);

import mongoose from 'mongoose';

const MusicSchema = new mongoose.Schema({
     title: {
          type: String,
          required: true,
          trim: true
     },
     artist: {
          type: String,
          trim: true
     },
     url: {
          type: String,
          required: true
     }
}, {
     timestamps: true,
});

export const Music = mongoose.model('Music', MusicSchema);

import mongoose from 'mongoose';

const ContentBlockSchema = new mongoose.Schema({
     type: {
          type: String,
          enum: ['text', 'image', 'video'],
          required: true
     },
     content: {
          type: String,
          required: true
     },
     order: {
          type: Number,
          default: 0
     }
}, { _id: true });

const TopicSchema = new mongoose.Schema({
     title: {
          type: String,
          required: true,
     },
     image:{
          type:String,
          required:true,
     },
     // description: {
     //      type:String,
     //      required:true
     // }, // Array of content blocks
     description:[ContentBlockSchema]
}, {
     timestamps: true,
});

export const Topic = mongoose.model('Topic', TopicSchema);
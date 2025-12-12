import mongoose from "mongoose";

const StarSchema = new mongoose.Schema({
     Count:{
          type: Number,
          default: 0
     },
     createdBy:{
          type: mongoose.Schema.Types.ObjectId,
          ref:'User'
     }
},{
     timestamps:true
})

export const Star = mongoose.model('Star',StarSchema);
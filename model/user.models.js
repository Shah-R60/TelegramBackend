import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
const UserSchema = new mongoose.Schema({
     email:{
          type:String,
          required:true,
          unique:true,
          lowercase:true,
          trim:true,
     },
     name:{
          type:String,
          required:true,
          unique:true,
          lowercase:true
     },
     picture:{
          type:String,
          require:true
     },
     refreshToken:{
          type:String,
     },
     stars:{
          type:Number,
          default:10,
          min:0
     },
     // Report and Ban System
     reportCount:{
          type:Number,
          default:0,
          min:0
     },
     reportsGiven:{
          type:Number,
          default:0,
          min:0
     },
     isBanned:{
          type:Boolean,
          default:false
     },
     banExpiresAt:{
          type:Date,
          default:null
     },
     banReason:{
          type:String,
          default:null
     },
     weeklyBanCount:{
          type:Number,
          default:0,
          min:0
     },
     weeklyBanResetDate:{
          type:Date,
          default:null
     },
     probationExpiresAt:{
          type:Date,
          default:null
     },
     banHistory:[{
          bannedAt:{
               type:Date,
               required:true
          },
          banDuration:{
               type:String,
               enum:['24h','7d'],
               required:true
          },
          reason:{
               type:String,
               required:true
          },
          reportCount:{
               type:Number,
               required:true
          }
     }],
     lastReportDate:{
          type:Date,
          default:null
     }
     
},{
     timestamps: true
})



UserSchema.methods.generateAccessToken = function(){
     return jwt.sign(
          {
               id:this._id,
               email:this.email,
               name:this.name,
          },
          process.env.ACCESS_TOKEN_SECRET,
          {
               expiresIn:process.env.ACCESS_TOKEN_EXPIRY
          }
     )
}

UserSchema.methods.generateRefreshToken = function(){
     return jwt.sign(
          {
               id:this._id,
               email:this.email,
               name:this.name,
          },
          process.env.REFRESH_TOKEN_SECRET,
          {
               expiresIn:process.env.REFRESH_TOKEN_EXPIRY
          }
     )
}


export const User = mongoose.model('User',UserSchema);

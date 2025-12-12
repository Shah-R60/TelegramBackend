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

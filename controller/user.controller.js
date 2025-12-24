import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../model/user.models.js";
import jwt from "jsonwebtoken";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { StreamClient } from '@stream-io/node-sdk';

const registerUser = asyncHandler(async (req ,res)=>{
     // Logic for registering a user
     res.status(201).json({
          message: "User registered successfully",
          // user: req.body
     });
})

// *************Logout***************************************

const logoutUser = asyncHandler(async (req, res) => {
     console.log("in controller logout user");
     await User.findByIdAndUpdate(
          req.user._id,
          {
               $unset: {
                    refreshToken: 1
               }
          }, {
          new: true
     }
     )

     const options = {
          httpOnly: true,
          secure: true
     }

     console.log(req.user._id);
     return res
          .status(200)
          .clearCookie("accessToken", options)
          .clearCookie("refreshToken", options)
          .json(new ApiResponse(200, "user is logged out successfully"))
})





// ****************************Refresh Token Logic***************************************


const refreshAccessToken = asyncHandler(async (req,res)=>{
  console.log("in controller refresh token");
  const incomingrefreshtoken = req.cookies.refreshToken||req.body.refreshToken
    //  console.log(incomingrefreshtoken);
  if(!incomingrefreshtoken){
    throw new ApiError(401,"unauthorized request");
  }
  // console.log("reach");
try {
        // console.log(incomingrefreshtoken);
    const decodedtoken = jwt.verify(
      incomingrefreshtoken,
      process.env.REFRESH_TOKEN_SECRET
    )
    // console.log("reach");
    // console.log("decoded token",decodedtoken);
  
    const user =await User.findById(decodedtoken?._id)
    if(!user){
      throw new apierror(401,"unauthorized request");
    }
  
    if(incomingrefreshtoken!==user?.refreshToken)
    {
      throw new ApiError(401,"Refresh token is expired or used");
    }
  
    const options={
      httpOnly:true,
      secure:true
    }
  
    const accessToken = user.generateAccessToken();
     const newrefreshToken = user.generateRefreshToken();
     
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",options)
    .json(
      new ApiResponse(
        200,
        {accessToken,refreshAccessToken:newrefreshToken},
        "Access token refreshed"
    )
    )
} catch (error) {
  throw new ApiError(401,error?.message||"invalid refresh token")
}
})

// ****************************Get Current User***************************************

const getCurrentUser = asyncHandler(async (req, res) => {
     const user = await User.findById(req.user._id).select('-refreshToken -__v');
     
     if (!user) {
          throw new ApiError(404, "User not found");
     }

     return res.status(200).json(
          new ApiResponse(200, user, "User fetched successfully")
     );
});

// ****************************Star Management***************************************

const increaseStar = asyncHandler(async (req, res) => {
     const { amount } = req.body;
     
     // Validate amount
     if (!amount || amount <= 0) {
          throw new ApiError(400, "Invalid amount. Amount must be greater than 0");
     }

     const user = await User.findByIdAndUpdate(
          req.user._id,
          { $inc: { stars: amount } },
          { new: true }
     ).select('-refreshToken -__v');

     if (!user) {
          throw new ApiError(404, "User not found");
     }

     return res.status(200).json(
          new ApiResponse(200, { 
               stars: user.stars
          }, `${amount} star(s) increased successfully`)
     );
});

const decreaseStar = asyncHandler(async (req, res) => {
     const { amount } = req.body;
     
     // Validate amount
     if (!amount || amount <= 0) {
          throw new ApiError(400, "Invalid amount. Amount must be greater than 0");
     }

     const user = await User.findById(req.user._id);
     
     if (!user) {
          throw new ApiError(404, "User not found");
     }

     if (user.stars < amount) {
          throw new ApiError(400, `Insufficient stars. You have ${user.stars} stars but need ${amount}`);
     }

     user.stars -= amount;
     await user.save();

     return res.status(200).json(
          new ApiResponse(200, { 
               stars: user.stars
          }, `${amount} star(s) decreased successfully`)
     );
});

// ****************************GetStream Token***************************************

const getStreamToken = asyncHandler(async (req, res) => {
     const user = await User.findById(req.user._id);
     
     if (!user) {
          throw new ApiError(404, "User not found");
     }

     // Generate Stream token using jwt with Stream secret
     const streamToken = jwt.sign(
          { user_id: user._id.toString() },
          process.env.STREAM_SECRET_KEY,
          { expiresIn: '1h' }
     );

     return res.status(200).json(
          new ApiResponse(200, { 
               streamToken: streamToken,
               streamUserId: user._id.toString(),
               streamApiKey: process.env.STREAM_API_KEY,
               userName: user.name,
               userImage: user.picture,
               userEmail: user.email
          }, "Stream token generated successfully")
     );
});




export {
     logoutUser,
     refreshAccessToken,
     getCurrentUser,
     increaseStar,
     decreaseStar,
     getStreamToken
}

export default registerUser;
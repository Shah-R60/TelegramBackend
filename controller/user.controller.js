import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../model/user.models.js";
import jwt from "jsonwebtoken";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

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























export {
     logoutUser,
     refreshAccessToken
}

export default registerUser;
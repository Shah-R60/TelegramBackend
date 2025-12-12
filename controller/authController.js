import oauthClient from "../utils/googleConfig.js"; // Now it's an object, not a function
import axios from "axios";
import { User } from "../model/user.models.js";
import jwt from "jsonwebtoken";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

async function googleLogin(req, res) {
     try {
          const { code } = req.query;
          const { tokens } = await oauthClient.getToken(code);
          oauthClient.setCredentials(tokens);
          const userInfo = await axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${tokens.access_token}`);

          const { email, name, picture } = userInfo.data;
          let user = await User.findOne({ email });

          if (!user) {
               user = await User.create({
                    name,
                    email,
                    picture,
                    // refreshToken: refreshToken
               });
          }

          const Accesstoken = user.generateAccessToken();
          const refreshToken = user.generateRefreshToken();

          //    console.log("User logged in:", user);
          // console.log("Generated refreshtoken token:", refreshToken);
          user.refreshToken = refreshToken
          user.save({ validateBeforeSave: false })
          const loggedInUser = await User.findById(user._id).select("-password -refreshToken");



          const options = {
               httpOnly: true,
               secure: true,
               maxAge: 7 * 24 * 60 * 60 * 1000, 
               // sameSite: "None", // Adjust based on your requirements
          }
          console.log("ready to send json");
          return res
               .status(200)
               .cookie("accessToken", Accesstoken, options)
               .cookie("refreshToken", refreshToken, options)
               .json(
                    new ApiResponse(200,
                         {
                              user: loggedInUser, Accesstoken, refreshToken
                         }, "user is logged in successfull"
                    )
               )

     } catch (err) {
          console.error("Google login error:", err);
          res.status(500).json({
               success: false,
               message: "Internal Server Error",
               error: err.message
          });
     }
}

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






export default googleLogin;

export {
     logoutUser
}
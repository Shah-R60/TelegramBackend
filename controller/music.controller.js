import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadoncloudinary } from "../utils/cloudinary.js";
import { Music } from "../model/music.models.js";

const getLatestMusic = asyncHandler(async (req, res) => {
     const latest = await Music.findOne().sort({ createdAt: -1 });

     if (!latest) {
          throw new ApiError(404, "No music found");
     }

     return res.status(200).json(
          new ApiResponse(200, latest, "Latest music retrieved successfully")
     );
});

export { uploadMusic, getLatestMusic };

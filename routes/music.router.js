import { Router } from "express";
import { upload } from "../middleware/multer.middleware.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { getLatestMusic } from "../controller/music.controller.js";

const router = Router();


router.route("/latest").get(verifyJWT,getLatestMusic);

export default router;

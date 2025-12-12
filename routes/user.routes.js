import {Router} from 'express';
import registerUser, { logoutUser, refreshAccessToken } from '../controller/user.controller.js';
import { verifyJWT } from '../middleware/auth.middleware.js';


const router = Router();

router.route('/register').get(registerUser)
router.route("/logout").post(verifyJWT,logoutUser);
router.route("/refresh").post(refreshAccessToken);



export default router;
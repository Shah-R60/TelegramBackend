import {Router} from 'express';
import registerUser, { logoutUser, refreshAccessToken, getCurrentUser, increaseStar, decreaseStar, getStreamToken } from '../controller/user.controller.js';
import { verifyJWT } from '../middleware/auth.middleware.js';


const router = Router();

router.route('/register').get(registerUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh").post(refreshAccessToken);

// User info and management
router.route('/me').get(verifyJWT, getCurrentUser);

// Star management
router.route('/stars/increase').post(verifyJWT, increaseStar);
router.route('/stars/decrease').post(verifyJWT, decreaseStar);

// GetStream token
router.route('/stream-token').get(verifyJWT, getStreamToken);



export default router;
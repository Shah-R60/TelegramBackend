import { Router } from 'express';
import { joinQueue, leaveQueue, checkStatus } from '../controller/matchmaking.controller.js';
import { verifyJWT } from '../middleware/auth.middleware.js';

const router = Router();

// All matchmaking routes require authentication
router.route('/join').post(verifyJWT, joinQueue);
router.route('/leave').post(verifyJWT, leaveQueue);
router.route('/status').get(verifyJWT, checkStatus);

export default router;

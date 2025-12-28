import { Router } from 'express';
import { submitReport, getBanStatus } from '../controller/report.controller.js';
import { verifyJWT } from '../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.route('/submit').post(verifyJWT, submitReport);
router.route('/ban-status').get(verifyJWT, getBanStatus);

export default router;

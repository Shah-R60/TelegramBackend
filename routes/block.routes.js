import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.middleware.js';
import { submitBlock } from '../controller/block.controller.js';

const router = Router();

router.route('/submit').post(verifyJWT, submitBlock);

export default router;

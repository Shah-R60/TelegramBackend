import {Router} from 'express';
import googleLogin, { googleLoginMobile } from '../controller/authController.js';
const router = Router();

router.get('/test', (req, res) => {
  res.send("Test route is working!");
}); 

router.get('/google',googleLogin);
router.post('/google', googleLoginMobile);


//secure routes

export default router;
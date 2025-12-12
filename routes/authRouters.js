import {Router} from 'express';
import googleLogin from '../controller/authController.js';
const router = Router();

router.get('/test', (req, res) => {
  res.send("Test route is working!");
}); 

router.get('/google',googleLogin)


//secure routes

export default router;
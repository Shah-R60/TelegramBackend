export function admin(req,res,next){
     console.log("Unauthorized user trying to upload topics");
          console.log("user email", req.user);
          console.log("authorized email", process.env.AUTHORIZED_USER_EMAIL);
     if(req.user?.email !== process.env.AUTHORIZED_USER_EMAIL)
     {
          
          return res.status(403).json({
               success:false,
               message:"you are not authorized to upload topics"
          });
          
     }
     next();
}
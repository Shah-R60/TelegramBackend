import mongoose from "mongoose";
import { DB_Name } from "../constant.js";


const connectDB = async()=>{
     try{
      const connnectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_Name}`);
      console.log("MongoDB connected successfully");  
      console.log(`Connected to database: ${connnectionInstance.connection.host}`);
     }
     catch(error)
     {
               console.error("MongoDB connection failed:", error.message);
               process.exit(1); // Exit the process with failure
     }
}

export default connectDB;
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";

export const verifyJwt = asyncHandler(async(req,_,next)=>{
    // no use of res replace it with _
   try {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer","")
 
    if(!token){
     throw new ApiError(401,"Unauthorized request");
    }
 
   const decodedToken = jwt.verify(token,proccess.env.ACCESS_TOKEN_SECRET);
 
    const user = await User.findById(decodedToken?._id).select
    ("-password - refreshToken")
 
    if(!user){
     //think about frontned
     throw new ApiError(404,"Invalid Access Token")
    }
 
    req.user = user;
    next();
   } catch (error) {
    throw new ApiError(401,error?.message || "Invalid access token")
   }

})
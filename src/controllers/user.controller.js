import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const registerUser = asyncHandler(async (req,res)=>{
    // res.status(200).json({
    //     message:"ok"
    // })

    //get user details from frontend as per model
    //validation (email check etc, not empty)
    //check if user already exists : username or email unique
    //check for images, check for avatar
    //upload them to cloudnry, avatar
    // create user objects - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    //return res

    const {fullName, email, username,password}=req.body
    console.log("email",email);

    // if(fullName===""){
    //     throw new ApiError(400,"fullName is required")
    // }
    //validation
    if(
        [fullName,email,username,password].some((field)=>
        field?.trim()===""
        )
    ){
        throw new ApiError(400,"All fields are required");
    }
//3
    const existedUser = User.findOne({
        $or:[{ username },{email}]
    })

    if(existedUser){
        throw new ApiError(409,"User already exits")
    }
//upload image
    const  avatarLocalPath = req.files?.avatar[0]?.path;
   const coverImageLocalPath =  req.files?.coverImage[0]?.path;
//check avatar

if(!avatarLocalPath){
    throw new ApiError(400,"Avatat file is requried");
}
//upload on cloudinary

  const avatar =  await uploadOnCloudinary(avatarLocalPath);
  const coverImage =  await uploadOnCloudinary(coverImageLocalPath);

  //checking avatar again
   if(!avatar)  throw new ApiError(400,"Avatat file is requried");

   // creating user entry

   const user = await User.create({
    fullName,
    avatar:avatar.url,
    coverImage:coverImage?.url || "",
    email,
    password,
    username:username.toLowerCase()
   })

   //check for user entry
   const createdUser = await User.findById(User._id).select(
    "-password -refreshToken"
   )

   if(!createdUser)
   throw new ApiError(500,"Something went wrong while regestring the user");

   //sending response

   return res.status(201).json(
    new ApiResponse(200,createdUser, "User registerd Successfully")
   )
})

export {registerUser}
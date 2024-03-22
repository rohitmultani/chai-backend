import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async(userId)=>{
    try{
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave:false}) // isse password ko validate ni krna pdega

        return {accessToken,refreshToken}
    }
    catch(error){
        throw new ApiError(500,"something went wrong while generating refresh and access token");
    }
}

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
    // console.log("email",email);

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
    const existedUser = await User.findOne({
        $or:[{ username },{email}]
    })

    if(existedUser){
        throw new ApiError(409,"User already exits")
    }
//upload image
    const avatarLocalPath = req.files?.avatar[0]?.path;
//    const coverImageLocalPath =  req.files?.coverImage[0]?.path; // it will throw undefined error

let coverImageLocalPath;
if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage>0){
    coverImageLocalPath = req.files.coverImage[0].path
}
//check avatar

if(!avatarLocalPath){
    throw new ApiError(400,"Avatar file is requried");
}
//upload on cloudinary

  const avatar =  await uploadOnCloudinary(avatarLocalPath);
  const coverImage =  await uploadOnCloudinary(coverImageLocalPath);

  //checking avatar again
   if(!avatar)  throw new ApiError(400,"Avatar file is requried");

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
   const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
   )

   if(!createdUser)
   throw new ApiError(500,"Something went wrong while regestring the user");

   //sending response
console.log(req.body)
console.log(req.files)
   return res.status(201).json(
    new ApiResponse(200,createdUser, "User registerd Successfully")
   )
})

const loginUser = asyncHandler(async (req,res)=>{
//todos
//req->body ->data
//username or email
// username or email based signin
//find the user
//password check
//access and refresh token
//send cookies


//req data
    const {email, username, password} = req.body;

    if(!(username || email)){
        throw new ApiError(400,"username or email is required");
    }

    const user = await User.findOne({
        $or:[{username},{email}]
     })

     if(!user){
        throw new ApiError(404,"User does not exist");
     }

     const isPasswordValid = await user.isPasswordCorrect(password);

     if(!isPasswordValid){
        throw new ApiError(404,"Invalid user Credentials ");
     }

     const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)

     const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

     //sending cookies
     const options = {
        httpOnly:true,
        secure:true
     }

     return res
     .status(200)
     .cookie("accessToken",accessToken,options)
     .cookie("refreshToken", refreshToken, options)
     .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,
                refreshToken
            },
            "User Logged In SuccessFully"
        )
     )
})

//logout functionality

const logoutUser = asyncHandler(async(req,res)=>{
    //delete cookie
    //unable refresh token

    //how to get user access // middleware add kiya h tb mila
    // req.user._id

  await  User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken : undefined
            }
        },
        {
            new : true
        }
    )

    const options = {
        httpOnly:true,
        secure:true
    }
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged Out"))
})

const refreshAccessToken = asyncHandler(async (req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(400,"unauthorised request");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodeToken?._id)
    
        if(!user){
            throw new ApiError(401,"Invalid refresh token")
        }
    
        if(incomingRefreshToken!==user?.refreshToken){
            throw new ApiError(401,"Refresh token is expired or used")
        }
    
        const options = {
            httpOnly:true,
            secure:true
        }
    
       const {accessToken,newRefreshToken} =  await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken : newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async (req,res)=>{
    const {oldPassword,newPassword} = req.body;

    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave:false})

    return res.status(200)
    .json(200)
    .json(new ApiResponse(200,{},"Password changed successfully"));

})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(200,req.user,"current user fetched successfully")
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullName,email} = req.body

    if(!fullName || !email){
        throw new ApiError(400,"All field are required")
    }

    const user =  await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                email:email
                //both are same as per es6 syntax
            }
        },
        {new:true}
        ).select("-password")

        return res.status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"));
})


const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing");
    }

    //todo delete avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiErro(400,"Error while uploading on avatar");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
        $set:{
            avatar:avatar.url
        }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Avatar updated successfully"))
})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path;

    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover Image file is missing");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(coverImage.url){
        throw new ApiErro(400,"Error while uploading on Cover Image ");
    }

   const user =  await User.findByIdAndUpdate(
        req.user?._id,
        {
        $set:{
            avatar:avatar.url
        }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Cover Image updated successfully"))
})

export {registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
}
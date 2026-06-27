import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { env } from "../config/env.js";
import { OTP } from "../models/otp.model.js";
import { generateOTP, hashOTP, verifyOTP, getOTPExpiry } from "../utils/otp.util.js";
import { EmailService } from "../services/email/EmailService.js";

const cookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: env.nodeEnv === "production" ? "none" : "lax"
};

const getCookieOptions = (maxAge) => {
  return {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: env.nodeEnv === "production" ? "none" : "lax",
    maxAge
  };
};

const accessTokenCookieOptions = getCookieOptions(15 * 60 * 1000);
const refreshTokenCookieOptions = getCookieOptions(7 * 24 * 60 * 60 * 1000);

const generateAccessAndRefreshTokens = async (userId) => {
  const user = await User.findById(userId).select("+refreshToken");

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({
    validateBeforeSave: false
  });

  return {
    accessToken,
    refreshToken
  };
};

const sendAuthCookies = ({ res, accessToken, refreshToken }) => {
  res.cookie("accessToken", accessToken, accessTokenCookieOptions);
  res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);
};



export const signupUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    throw new ApiError(400, "Name, email and password are required");
  }

  const existingUser = await User.findOne({
    email: email.toLowerCase()
  });

  if (existingUser) {
    throw new ApiError(409, "User already exists with this email");
  }

  // Generate OTP
  const otp = generateOTP();
  const hashedOTP = await hashOTP(otp);

  await OTP.deleteMany({ email: email.toLowerCase(), purpose: "signup" });

  await OTP.create({
    email: email.toLowerCase(),
    otpHash: hashedOTP,
    purpose: "signup",
    expiresAt: getOTPExpiry(),
    userData: { name, password }
  });

  await EmailService.sendSignupOTP(email, otp);

  return res.status(201).json(
    new ApiResponse(
      201,
      { requiresOtp: true, email: email.toLowerCase() },
      "OTP sent to email. Please verify to complete registration."
    )
  );
});

export const verifySignupOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ApiError(400, "Email and OTP are required");
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) throw new ApiError(400, "Email already verified");

  const otpRecord = await OTP.findOne({ email: email.toLowerCase(), purpose: "signup" }).sort({ createdAt: -1 });

  if (!otpRecord) throw new ApiError(400, "OTP expired or not found");

  const isValid = await verifyOTP(otp, otpRecord.otpHash);
  if (!isValid) {
    otpRecord.attempts += 1;
    if (otpRecord.attempts >= 3) {
      await OTP.findByIdAndDelete(otpRecord._id);
      throw new ApiError(400, "Too many failed attempts. Please request a new OTP.");
    }
    await otpRecord.save();
    throw new ApiError(400, "Invalid OTP");
  }

  // Create user only after successful verification
  const user = await User.create({
    name: otpRecord.userData.name,
    email: otpRecord.email,
    password: otpRecord.userData.password,
    isEmailVerified: true
  });

  await OTP.deleteMany({ email: email.toLowerCase(), purpose: "signup" });

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  sendAuthCookies({ res, accessToken, refreshToken });

  return res.status(200).json(
    new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "Email verified and logged in successfully")
  );
});

export const resendOTP = asyncHandler(async (req, res) => {
  const { email, purpose } = req.body;
  if (!email || !purpose) throw new ApiError(400, "Email and purpose are required");

  let userData = null;

  if (purpose === "signup") {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) throw new ApiError(400, "Email already verified");

    const existingOTP = await OTP.findOne({ email: email.toLowerCase(), purpose: "signup" }).sort({ createdAt: -1 });
    if (!existingOTP) throw new ApiError(400, "No signup request found. Please register again.");
    userData = existingOTP.userData;
  } else if (purpose === "forgot_password" || purpose === "change_password") {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw new ApiError(404, "User not found");
  }

  const otp = generateOTP();
  const hashedOTP = await hashOTP(otp);

  await OTP.deleteMany({ email: email.toLowerCase(), purpose });

  await OTP.create({
    email: email.toLowerCase(),
    otpHash: hashedOTP,
    purpose,
    expiresAt: getOTPExpiry(),
    ...(userData && { userData })
  });

  if (purpose === "signup") {
    await EmailService.sendSignupOTP(email, otp);
  } else if (purpose === "forgot_password") {
    await EmailService.sendForgotPasswordOTP(email, otp);
  } else if (purpose === "change_password") {
    await EmailService.sendChangePasswordOTP(email, otp);
  }

  return res.status(200).json(new ApiResponse(200, {}, "OTP resent successfully"));
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password?.trim()) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({
    email: email.toLowerCase()
  }).select("+password +refreshToken");

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (!user.isEmailVerified) {
    throw new ApiError(403, "Please verify your email before logging in.");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  sendAuthCookies({
    res,
    accessToken,
    refreshToken
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: loggedInUser,
        accessToken,
        refreshToken
      },
      "User logged in successfully"
    )
  );
});

export const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1
      }
    },
    {
      new: true
    }
  );

  return res
    .status(200)
    .clearCookie("accessToken", accessTokenCookieOptions)
    .clearCookie("refreshToken", refreshTokenCookieOptions)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is required");
  }

  const decodedToken = jwt.verify(incomingRefreshToken, env.jwtRefreshSecret);

  const user = await User.findById(decodedToken?._id).select("+refreshToken");

  if (!user) {
    throw new ApiError(401, "Invalid refresh token");
  }

  if (incomingRefreshToken !== user.refreshToken) {
    throw new ApiError(401, "Refresh token is expired or used");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          accessToken,
          refreshToken
        },
        "Access token refreshed successfully"
      )
    );
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, { user: req.user }, "Current user fetched successfully"));
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, "Email is required");

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // Return success anyway to prevent email enumeration
    return res.status(200).json(new ApiResponse(200, {}, "If your email is registered, you will receive an OTP."));
  }

  const otp = generateOTP();
  const hashedOTP = await hashOTP(otp);

  await OTP.deleteMany({ email: email.toLowerCase(), purpose: "forgot_password" });

  await OTP.create({
    email: email.toLowerCase(),
    otpHash: hashedOTP,
    purpose: "forgot_password",
    expiresAt: getOTPExpiry()
  });

  await EmailService.sendForgotPasswordOTP(email, otp);

  return res.status(200).json(new ApiResponse(200, {}, "If your email is registered, you will receive an OTP."));
});

export const verifyResetOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) throw new ApiError(400, "Email and OTP are required");

  const otpRecord = await OTP.findOne({ email: email.toLowerCase(), purpose: "forgot_password" }).sort({ createdAt: -1 });
  if (!otpRecord) throw new ApiError(400, "OTP expired or not found");

  const isValid = await verifyOTP(otp, otpRecord.otpHash);
  if (!isValid) {
    otpRecord.attempts += 1;
    if (otpRecord.attempts >= 3) {
      await OTP.findByIdAndDelete(otpRecord._id);
      throw new ApiError(400, "Too many failed attempts. Please request a new OTP.");
    }
    await otpRecord.save();
    throw new ApiError(400, "Invalid OTP");
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user) throw new ApiError(404, "User not found");

  await OTP.deleteMany({ email: email.toLowerCase(), purpose: "forgot_password" });

  const secret = env.jwtAccessSecret + user.password;
  const resetToken = jwt.sign({ email: user.email }, secret, { expiresIn: '15m' });

  return res.status(200).json(new ApiResponse(200, { resetToken }, "OTP verified successfully."));
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) {
    throw new ApiError(400, "Reset token and new password are required");
  }

  if (newPassword.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters long");
  }

  let decoded;
  try {
    decoded = jwt.decode(resetToken);
  } catch (err) {
    throw new ApiError(400, "Invalid reset token");
  }

  if (!decoded || !decoded.email) {
    throw new ApiError(400, "Invalid reset token payload");
  }

  const user = await User.findOne({ email: decoded.email }).select("+password");
  if (!user) throw new ApiError(404, "User not found");

  const secret = env.jwtAccessSecret + user.password;
  try {
    jwt.verify(resetToken, secret);
  } catch (err) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  user.password = newPassword;
  user.refreshToken = undefined;
  await user.save();

  return res.status(200).json(new ApiResponse(200, {}, "Password reset successfully. You can now login."));
});

export const sendChangePasswordOTP = asyncHandler(async (req, res) => {
  const { currentPassword } = req.body;
  
  if (!currentPassword) {
    throw new ApiError(400, "Current password is required");
  }

  const user = await User.findById(req.user._id).select("+password");
  
  const isPasswordValid = await user.isPasswordCorrect(currentPassword);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid current password");
  }

  const otp = generateOTP();
  const hashedOTP = await hashOTP(otp);

  await OTP.deleteMany({ email: user.email, purpose: "change_password" });

  await OTP.create({
    email: user.email,
    otpHash: hashedOTP,
    purpose: "change_password",
    expiresAt: getOTPExpiry()
  });

  await EmailService.sendChangePasswordOTP(user.email, otp);

  return res.status(200).json(new ApiResponse(200, {}, "OTP sent successfully to your email."));
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword, otp } = req.body;
  
  if (!currentPassword || !newPassword || !confirmPassword || !otp) {
    throw new ApiError(400, "Current password, new password, confirm password, and OTP are required");
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "New password and confirm password do not match");
  }

  if (newPassword.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters long");
  }

  const user = await User.findById(req.user._id).select("+password");
  
  const isPasswordValid = await user.isPasswordCorrect(currentPassword);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid current password");
  }

  if (currentPassword === newPassword) {
    throw new ApiError(400, "New password must be different from current password");
  }

  const otpRecord = await OTP.findOne({ email: user.email, purpose: "change_password" }).sort({ createdAt: -1 });
  if (!otpRecord) throw new ApiError(400, "OTP expired or not found");

  const isValid = await verifyOTP(otp, otpRecord.otpHash);
  if (!isValid) {
    otpRecord.attempts += 1;
    if (otpRecord.attempts >= 3) {
      await OTP.findByIdAndDelete(otpRecord._id);
      throw new ApiError(400, "Too many failed attempts. Please request a new OTP.");
    }
    await otpRecord.save();
    throw new ApiError(400, "Invalid OTP");
  }

  user.password = newPassword;
  user.refreshToken = undefined;
  await user.save();

  await OTP.deleteMany({ email: user.email, purpose: "change_password" });

  return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));
});
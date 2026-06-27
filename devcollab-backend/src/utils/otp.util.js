import crypto from "crypto";
import bcrypt from "bcryptjs";

// Generate a 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Hash OTP before saving to DB
export const hashOTP = async (otp) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(otp, salt);
};

// Verify OTP against hashed version in DB
export const verifyOTP = async (otp, hashedOTP) => {
  return await bcrypt.compare(otp, hashedOTP);
};

// Generate an expiry date (10 minutes from now)
export const getOTPExpiry = () => {
  return new Date(Date.now() + 10 * 60 * 1000);
};

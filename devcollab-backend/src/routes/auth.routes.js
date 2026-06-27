import { Router } from "express";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  signupUser,
  verifySignupOTP,
  resendOTP,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  changePassword,
  sendChangePasswordOTP
} from "../controllers/auth.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/signup", signupUser);
router.post("/verify-signup", verifySignupOTP);
router.post("/resend-otp", resendOTP);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOTP);
router.post("/reset-password", resetPassword);
router.post("/refresh-token", refreshAccessToken);

router.get("/me", verifyJWT, getCurrentUser);
router.post("/logout", verifyJWT, logoutUser);
router.post("/send-change-password-otp", verifyJWT, sendChangePasswordOTP);
router.post("/change-password", verifyJWT, changePassword);

export default router;
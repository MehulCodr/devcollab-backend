"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { forgotPassword, verifyResetOTP, resetPassword, resendOTP } = useAuth();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [countdown, setCountdown] = useState(0);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleRequestOTP = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await forgotPassword({ email });
      setStep(2);
      setCountdown(60);
      setSuccess("OTP sent to your email (if registered).");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await verifyResetOTP({ email, otp });
      setResetToken(res.resetToken);
      setStep(3);
      setSuccess("OTP verified. Please enter your new password.");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await resetPassword({ resetToken, newPassword });
      setSuccess("Password reset successfully. Redirecting to login...");
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await resendOTP({ email, purpose: "forgot_password" });
      setCountdown(60);
      setSuccess("OTP resent successfully.");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <section className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-8 shadow-xl">
        <div>
          <p className="text-sm text-blue-400 font-medium">DevCollaborator</p>
          <h1 className="text-3xl font-bold mt-2">Reset Password</h1>
          <p className="text-slate-400 mt-3">
            {step === 1 && "Enter your email to receive an OTP."}
            {step === 2 && "Enter the OTP sent to your email."}
            {step === 3 && "Enter your new password."}
          </p>
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}
        
        {success && (
          <p className="mt-4 rounded-xl bg-green-500/10 border border-green-500/30 px-4 py-3 text-sm text-green-300">
            {success}
          </p>
        )}

        {step === 1 && (
          <form onSubmit={handleRequestOTP} className="mt-8 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="test@example.com"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full rounded-xl bg-blue-600 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Requesting..." : "Send Reset OTP"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOTP} className="mt-8 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">6-Digit OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500 text-center tracking-[0.5em] text-lg font-mono"
                required
                maxLength={6}
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full rounded-xl bg-blue-600 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={handleResend}
                disabled={loading || countdown > 0}
                className="text-sm text-blue-400 hover:text-blue-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
              >
                {countdown > 0 ? `Resend OTP in ${countdown}s` : "Resend OTP"}
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleReset} className="mt-8 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New Password"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword}
              className="w-full rounded-xl bg-blue-600 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-400">
          Remembered your password?{" "}
          <Link href="/" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
            Login
          </Link>
        </p>
      </section>
    </main>
  );
}

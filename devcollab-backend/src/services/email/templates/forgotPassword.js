export const forgotPasswordTemplate = (otp) => `
<div style="font-family: Arial, sans-serif; padding: 20px;">
  <h2>Password Reset Request</h2>
  <p>We received a request to reset your password. Please use the following OTP to reset your password. This OTP is valid for 10 minutes.</p>
  <h1 style="color: #EF4444; letter-spacing: 5px;">${otp}</h1>
  <p>If you did not request this, please ignore this email.</p>
</div>
`;

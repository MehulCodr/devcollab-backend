export const changePasswordTemplate = (otp) => `
<div style="font-family: Arial, sans-serif; padding: 20px;">
  <h2>Password Change Request</h2>
  <p>We received a request to change your password. Please use the following OTP to confirm your new password. This OTP is valid for 10 minutes.</p>
  <h1 style="color: #F59E0B; letter-spacing: 5px;">${otp}</h1>
  <p>If you did not request this, please secure your account immediately.</p>
</div>
`;

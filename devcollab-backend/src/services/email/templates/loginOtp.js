export const loginOtpTemplate = (otp) => `
<div style="font-family: Arial, sans-serif; padding: 20px;">
  <h2>Login Request</h2>
  <p>We received a request to log in to your account. Please use the following OTP to log in. This OTP is valid for 10 minutes.</p>
  <h1 style="color: #10B981; letter-spacing: 5px;">${otp}</h1>
  <p>If you did not request this, please secure your account immediately.</p>
</div>
`;

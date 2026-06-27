export const signupOtpTemplate = (otp) => `
<div style="font-family: Arial, sans-serif; padding: 20px;">
  <h2>Welcome to DevCollaborator!</h2>
  <p>Please use the following OTP to verify your email address. This OTP is valid for 10 minutes.</p>
  <h1 style="color: #4F46E5; letter-spacing: 5px;">${otp}</h1>
  <p>If you did not request this, please ignore this email.</p>
</div>
`;

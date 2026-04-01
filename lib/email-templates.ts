import {
  BRAND_EMAIL_FROM_NAME,
  BRAND_NAME,
  BRAND_PLATFORM_LABEL,
  BRAND_SUPPORT_EMAIL,
} from "@/lib/brand";

const baseStyles = `
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: #f9fafb;
    margin: 0;
    padding: 0;
  }
  .container {
    max-width: 600px;
    margin: 40px auto;
    background-color: #ffffff;
    border-radius: 16px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    overflow: hidden;
  }
  .header {
    background-color: #000000;
    padding: 32px 40px;
    text-align: center;
  }
  .logo {
    color: #ffffff;
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.5px;
    margin: 0;
  }
  .logo span {
    color: #a855f7;
  }
  .content {
    padding: 40px;
    color: #374151;
  }
  .heading {
    font-size: 20px;
    font-weight: 700;
    color: #111827;
    margin-top: 0;
    margin-bottom: 24px;
  }
  .text {
    font-size: 16px;
    line-height: 24px;
    margin-top: 0;
    margin-bottom: 24px;
    color: #4b5563;
  }
  .otp-container {
    background-color: #f3f4f6;
    border-radius: 12px;
    padding: 24px;
    text-align: center;
    margin-bottom: 32px;
    border: 1px solid #e5e7eb;
  }
  .otp-code {
    font-size: 36px;
    font-weight: 800;
    letter-spacing: 8px;
    color: #111827;
    margin: 0;
  }
  .footer {
    background-color: #f9fafb;
    padding: 32px 40px;
    text-align: center;
    border-top: 1px solid #f3f4f6;
  }
  .footer-text {
    font-size: 14px;
    line-height: 20px;
    color: #6b7280;
    margin: 0;
  }
  .divider {
    height: 1px;
    background-color: #e5e7eb;
    margin: 32px 0;
  }
`;

const footerCopy = `
  &copy; ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.<br>
  ${BRAND_PLATFORM_LABEL}<br>
  ${BRAND_SUPPORT_EMAIL}
`;

export const generateOTPEmailTemplate = (otp: string, isResend = false) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your OTP Code - ${BRAND_NAME}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">${BRAND_EMAIL_FROM_NAME.split(" ")[0]} <span>${BRAND_EMAIL_FROM_NAME.split(" ").slice(1).join(" ")}</span></h1>
    </div>
    <div class="content">
      <h2 class="heading">${isResend ? "Your New Verification Code" : "Verify your email address"}</h2>
      <p class="text">
        Hello,<br><br>
        ${
          isResend
            ? "We received a request to send a new verification code for your account."
            : `Thank you for signing up for ${BRAND_PLATFORM_LABEL}. To complete your registration and secure your account, please use the verification code below.`
        }
      </p>

      <div class="otp-container">
        <p class="text" style="margin-bottom: 12px; font-size: 14px; text-transform: uppercase; font-weight: 600; letter-spacing: 1px; color: #6b7280;">Verification Code</p>
        <p class="otp-code">${otp}</p>
      </div>

      <p class="text">
        This code is valid for <strong>10 minutes</strong>. Please do not share this code with anyone.
      </p>

      <div class="divider"></div>

      <p class="text" style="font-size: 14px;">
        If you didn't request this code, you can safely ignore this email. Someone else might have typed your email address by mistake.
      </p>
    </div>
    <div class="footer">
      <p class="footer-text">${footerCopy}</p>
    </div>
  </div>
</body>
</html>
`;

export const generatePasswordResetOTP = (otp: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your Password - ${BRAND_NAME}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">${BRAND_EMAIL_FROM_NAME.split(" ")[0]} <span>${BRAND_EMAIL_FROM_NAME.split(" ").slice(1).join(" ")}</span></h1>
    </div>
    <div class="content">
      <h2 class="heading">Password Reset Request</h2>
      <p class="text">
        Hello,<br><br>
        We received a request to reset the password for your ${BRAND_NAME} account. Use the 6-digit verification code below to set a new password.
      </p>

      <div class="otp-container">
        <p class="text" style="margin-bottom: 12px; font-size: 14px; text-transform: uppercase; font-weight: 600; letter-spacing: 1px; color: #6b7280;">Reset Code</p>
        <p class="otp-code">${otp}</p>
      </div>

      <p class="text">
        For security reasons, this code will expire in <strong>1 hour</strong>. Please do not share this code with anyone.
      </p>

      <div class="divider"></div>

      <p class="text" style="font-size: 14px;">
        If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
      </p>
    </div>
    <div class="footer">
      <p class="footer-text">${footerCopy}</p>
    </div>
  </div>
</body>
</html>
`;

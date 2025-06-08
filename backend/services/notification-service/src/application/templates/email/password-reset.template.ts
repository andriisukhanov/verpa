export const passwordResetEmailTemplate = {
  subject: 'Reset your password - Verpa',
  
  html: (data: { username: string; resetUrl: string; ipAddress?: string; userAgent?: string }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #E94B3C 0%, #F56E62 100%);
      color: white;
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .logo {
      width: 60px;
      height: 60px;
      margin: 0 auto 20px;
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 30px;
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      color: #333;
      font-size: 24px;
      margin-bottom: 10px;
    }
    .content p {
      color: #666;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #E94B3C 0%, #F56E62 100%);
      color: white;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
      box-shadow: 0 4px 12px rgba(233, 75, 60, 0.3);
    }
    .button:hover {
      box-shadow: 0 6px 16px rgba(233, 75, 60, 0.4);
    }
    .divider {
      border-top: 1px solid #eee;
      margin: 30px 0;
    }
    .footer {
      background-color: #f9f9f9;
      padding: 30px;
      text-align: center;
      color: #999;
      font-size: 14px;
    }
    .footer a {
      color: #4A90E2;
      text-decoration: none;
    }
    .warning {
      background-color: #FFF5E6;
      border-left: 4px solid #FFA500;
      padding: 15px;
      margin: 20px 0;
      font-size: 14px;
      color: #856404;
    }
    .security-info {
      background-color: #F0F4F8;
      border-radius: 6px;
      padding: 15px;
      margin: 20px 0;
      font-size: 14px;
      color: #5A6C7D;
    }
    .security-info strong {
      color: #2C3E50;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🔒</div>
      <h1>Password Reset Request</h1>
    </div>
    
    <div class="content">
      <h2>Hi ${data.username},</h2>
      
      <p>
        We received a request to reset the password for your Verpa account. 
        If you made this request, click the button below to create a new password:
      </p>
      
      <div style="text-align: center;">
        <a href="${data.resetUrl}" class="button">Reset Password</a>
      </div>
      
      <div class="warning">
        ⏰ This password reset link will expire in 1 hour for security reasons.
      </div>
      
      <p>
        <strong>If you didn't request a password reset:</strong><br>
        Please ignore this email. Your password won't be changed unless you click the link above 
        and create a new password. For security, we recommend checking your account for any unusual activity.
      </p>
      
      ${data.ipAddress || data.userAgent ? `
      <div class="security-info">
        <strong>Request Details:</strong><br>
        ${data.ipAddress ? `IP Address: ${data.ipAddress}<br>` : ''}
        ${data.userAgent ? `Device: ${data.userAgent}` : ''}
      </div>
      ` : ''}
      
      <div class="divider"></div>
      
      <p style="color: #999; font-size: 14px;">
        Having trouble with the button? Copy and paste this link into your browser:
        <br>
        <a href="${data.resetUrl}" style="color: #4A90E2; word-break: break-all;">
          ${data.resetUrl}
        </a>
      </p>
      
      <p style="color: #999; font-size: 14px;">
        <strong>Security tip:</strong> Never share your password or this reset link with anyone. 
        Verpa staff will never ask for your password.
      </p>
    </div>
    
    <div class="footer">
      <p>
        <strong>Need help?</strong><br>
        Visit our <a href="https://verpa.app/help/password-reset">Help Center</a> for more information
        about password security and account protection.
      </p>
      <p>
        © 2024 Verpa. All rights reserved.<br>
        <a href="https://verpa.app/privacy">Privacy Policy</a> • 
        <a href="https://verpa.app/security">Security</a> • 
        <a href="https://verpa.app/contact">Contact Us</a>
      </p>
    </div>
  </div>
</body>
</html>
`,

  text: (data: { username: string; resetUrl: string; ipAddress?: string; userAgent?: string }) => `
Password Reset Request

Hi ${data.username},

We received a request to reset the password for your Verpa account.
If you made this request, visit the link below to create a new password:

${data.resetUrl}

This password reset link will expire in 1 hour for security reasons.

If you didn't request a password reset:
Please ignore this email. Your password won't be changed unless you click the link above 
and create a new password. For security, we recommend checking your account for any unusual activity.

${data.ipAddress || data.userAgent ? `
Request Details:
${data.ipAddress ? `IP Address: ${data.ipAddress}` : ''}
${data.userAgent ? `Device: ${data.userAgent}` : ''}
` : ''}

Security tip: Never share your password or this reset link with anyone. 
Verpa staff will never ask for your password.

Need help?
Visit our Help Center at https://verpa.app/help/password-reset

Best regards,
The Verpa Team

--
© 2024 Verpa. All rights reserved.
`
};
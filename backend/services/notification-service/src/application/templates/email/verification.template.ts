export const verificationEmailTemplate = {
  subject: 'Verify your email - Verpa',
  
  html: (data: { username: string; verificationUrl: string }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
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
      background: linear-gradient(135deg, #4A90E2 0%, #5B9FEF 100%);
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
      background: linear-gradient(135deg, #4A90E2 0%, #5B9FEF 100%);
      color: white;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
      box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
    }
    .button:hover {
      box-shadow: 0 6px 16px rgba(74, 144, 226, 0.4);
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
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🐠</div>
      <h1>Welcome to Verpa</h1>
    </div>
    
    <div class="content">
      <h2>Hi ${data.username}! 👋</h2>
      
      <p>
        Thanks for signing up for Verpa - your personal aquarium management assistant. 
        We're excited to help you keep your aquatic friends happy and healthy!
      </p>
      
      <p>
        To get started, please verify your email address by clicking the button below:
      </p>
      
      <div style="text-align: center;">
        <a href="${data.verificationUrl}" class="button">Verify Email Address</a>
      </div>
      
      <div class="warning">
        ⚠️ This verification link will expire in 24 hours. If it expires, you can request a new one from the app.
      </div>
      
      <div class="divider"></div>
      
      <p style="color: #999; font-size: 14px;">
        If you didn't create an account with Verpa, please ignore this email.
      </p>
      
      <p style="color: #999; font-size: 14px;">
        Having trouble with the button? Copy and paste this link into your browser:
        <br>
        <a href="${data.verificationUrl}" style="color: #4A90E2; word-break: break-all;">
          ${data.verificationUrl}
        </a>
      </p>
    </div>
    
    <div class="footer">
      <p>
        <strong>Verpa - Aquarium Management Made Simple</strong><br>
        Monitor • Track • Remind • Analyze
      </p>
      <p>
        © 2024 Verpa. All rights reserved.<br>
        <a href="https://verpa.app/privacy">Privacy Policy</a> • 
        <a href="https://verpa.app/terms">Terms of Service</a> • 
        <a href="https://verpa.app/help">Help Center</a>
      </p>
    </div>
  </div>
</body>
</html>
`,

  text: (data: { username: string; verificationUrl: string }) => `
Welcome to Verpa!

Hi ${data.username},

Thanks for signing up for Verpa - your personal aquarium management assistant. 
We're excited to help you keep your aquatic friends happy and healthy!

To get started, please verify your email address by visiting the link below:

${data.verificationUrl}

This verification link will expire in 24 hours. If it expires, you can request a new one from the app.

If you didn't create an account with Verpa, please ignore this email.

Best regards,
The Verpa Team

--
Verpa - Aquarium Management Made Simple
Monitor • Track • Remind • Analyze
© 2024 Verpa. All rights reserved.
`
};
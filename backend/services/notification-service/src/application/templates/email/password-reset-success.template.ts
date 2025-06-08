export const passwordResetSuccessTemplate = {
  subject: 'Password Reset Successful - Verpa',
  
  html: (variables: { username: string }) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f5f5f5;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .email-content {
          background-color: #ffffff;
          border-radius: 8px;
          padding: 40px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 32px;
          font-weight: bold;
          color: #1a73e8;
          text-decoration: none;
        }
        h1 {
          color: #333;
          font-size: 24px;
          margin-bottom: 20px;
        }
        .success-icon {
          text-align: center;
          margin: 30px 0;
        }
        .success-icon svg {
          width: 64px;
          height: 64px;
          fill: #4caf50;
        }
        .security-notice {
          background-color: #f0f7ff;
          border-left: 4px solid #1a73e8;
          padding: 15px 20px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .footer {
          text-align: center;
          margin-top: 40px;
          font-size: 12px;
          color: #666;
        }
        .footer a {
          color: #1a73e8;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="email-content">
          <div class="header">
            <a href="https://verpa.app" class="logo">Verpa</a>
          </div>
          
          <div class="success-icon">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          
          <h1>Password Reset Successful</h1>
          
          <p>Hi ${variables.username},</p>
          
          <p>Your password has been successfully reset. You can now log in to your Verpa account using your new password.</p>
          
          <div class="security-notice">
            <strong>Security Notice:</strong>
            <ul style="margin: 10px 0 0 0; padding-left: 20px;">
              <li>If you didn't request this password reset, please contact our support team immediately</li>
              <li>All your previous sessions have been logged out for security</li>
              <li>We recommend using a unique password that you don't use on other websites</li>
            </ul>
          </div>
          
          <p>For your security, this password reset was requested from:</p>
          <ul>
            <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
          </ul>
          
          <div class="footer">
            <p>If you have any questions, please contact our support team.</p>
            <p>&copy; ${new Date().getFullYear()} Verpa. All rights reserved.</p>
            <p>
              <a href="https://verpa.app/privacy">Privacy Policy</a> | 
              <a href="https://verpa.app/terms">Terms of Service</a>
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `,
  
  text: (variables: { username: string }) => `
Password Reset Successful - Verpa

Hi ${variables.username},

Your password has been successfully reset. You can now log in to your Verpa account using your new password.

Security Notice:
- If you didn't request this password reset, please contact our support team immediately
- All your previous sessions have been logged out for security
- We recommend using a unique password that you don't use on other websites

For your security, this password reset was requested on: ${new Date().toLocaleString()}

If you have any questions, please contact our support team.

© ${new Date().getFullYear()} Verpa. All rights reserved.
  `.trim(),
};
export const welcomeEmailTemplate = {
  subject: 'Welcome to Verpa! 🐠',
  
  html: (data: { username: string; loginUrl: string }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Verpa</title>
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
      font-size: 32px;
      font-weight: 600;
    }
    .logo {
      width: 80px;
      height: 80px;
      margin: 0 auto 20px;
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      color: #333;
      font-size: 24px;
      margin-bottom: 20px;
    }
    .content p {
      color: #666;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .feature {
      display: flex;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    .feature-icon {
      width: 40px;
      height: 40px;
      background: #F0F7FF;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 15px;
      flex-shrink: 0;
      font-size: 20px;
    }
    .feature-content h3 {
      margin: 0 0 5px 0;
      color: #333;
      font-size: 18px;
    }
    .feature-content p {
      margin: 0;
      color: #666;
      font-size: 14px;
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
    .divider {
      border-top: 1px solid #eee;
      margin: 30px 0;
    }
    .tips {
      background-color: #F8FBFF;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .tips h3 {
      color: #4A90E2;
      margin-top: 0;
    }
    .tips ul {
      margin: 0;
      padding-left: 20px;
      color: #666;
    }
    .tips li {
      margin-bottom: 10px;
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
    .social {
      margin: 20px 0;
    }
    .social a {
      display: inline-block;
      margin: 0 10px;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🐠</div>
      <h1>Welcome to Verpa!</h1>
    </div>
    
    <div class="content">
      <h2>Congratulations ${data.username}! 🎉</h2>
      
      <p>
        Your email has been verified and your Verpa account is now active. 
        You're all set to start managing your aquarium like a pro!
      </p>
      
      <h2>What you can do with Verpa:</h2>
      
      <div class="feature">
        <div class="feature-icon">🏠</div>
        <div class="feature-content">
          <h3>Create Your Aquarium</h3>
          <p>Set up your first aquarium profile with details about size, type, and inhabitants.</p>
        </div>
      </div>
      
      <div class="feature">
        <div class="feature-icon">📊</div>
        <div class="feature-content">
          <h3>Track Water Parameters</h3>
          <p>Log temperature, pH, ammonia, and other vital parameters to keep your fish healthy.</p>
        </div>
      </div>
      
      <div class="feature">
        <div class="feature-icon">⏰</div>
        <div class="feature-content">
          <h3>Never Miss Maintenance</h3>
          <p>Set reminders for water changes, filter cleaning, and feeding schedules.</p>
        </div>
      </div>
      
      <div class="feature">
        <div class="feature-icon">📸</div>
        <div class="feature-content">
          <h3>Document Progress</h3>
          <p>Take photos and notes to track your aquarium's journey over time.</p>
        </div>
      </div>
      
      <div style="text-align: center;">
        <a href="${data.loginUrl}" class="button">Start Managing Your Aquarium</a>
      </div>
      
      <div class="tips">
        <h3>🚀 Quick Start Tips:</h3>
        <ul>
          <li>Add your first aquarium and customize it with a photo</li>
          <li>Record your current water parameters as a baseline</li>
          <li>Set up your first maintenance reminder</li>
          <li>Explore the dashboard to see your aquarium stats</li>
        </ul>
      </div>
      
      <div class="divider"></div>
      
      <p style="text-align: center; color: #666;">
        <strong>Need help getting started?</strong><br>
        Check out our <a href="https://verpa.app/guide" style="color: #4A90E2;">Quick Start Guide</a> 
        or contact our support team.
      </p>
    </div>
    
    <div class="footer">
      <p>
        <strong>Join our community:</strong>
      </p>
      <div class="social">
        <a href="https://facebook.com/verpaapp">📘 Facebook</a>
        <a href="https://instagram.com/verpaapp">📷 Instagram</a>
        <a href="https://twitter.com/verpaapp">🐦 Twitter</a>
      </div>
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

  text: (data: { username: string; loginUrl: string }) => `
Welcome to Verpa!

Congratulations ${data.username}! 🎉

Your email has been verified and your Verpa account is now active. 
You're all set to start managing your aquarium like a pro!

What you can do with Verpa:

🏠 Create Your Aquarium
   Set up your first aquarium profile with details about size, type, and inhabitants.

📊 Track Water Parameters
   Log temperature, pH, ammonia, and other vital parameters to keep your fish healthy.

⏰ Never Miss Maintenance
   Set reminders for water changes, filter cleaning, and feeding schedules.

📸 Document Progress
   Take photos and notes to track your aquarium's journey over time.

Start Managing Your Aquarium: ${data.loginUrl}

🚀 Quick Start Tips:
• Add your first aquarium and customize it with a photo
• Record your current water parameters as a baseline
• Set up your first maintenance reminder
• Explore the dashboard to see your aquarium stats

Need help getting started?
Check out our Quick Start Guide at https://verpa.app/guide

Join our community:
Facebook: https://facebook.com/verpaapp
Instagram: https://instagram.com/verpaapp
Twitter: https://twitter.com/verpaapp

Best regards,
The Verpa Team

--
© 2024 Verpa. All rights reserved.
`
};
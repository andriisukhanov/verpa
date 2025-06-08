import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Handlebars from 'handlebars';
import { verificationEmailTemplate } from '../templates/email/verification.template';
import { passwordResetEmailTemplate } from '../templates/email/password-reset.template';
import { welcomeEmailTemplate } from '../templates/email/welcome.template';
import { passwordResetSuccessTemplate } from '../templates/email/password-reset-success.template';

export interface EmailTemplate {
  subject: string;
  html: string | ((data: any) => string);
  text?: string | ((data: any) => string);
}

@Injectable()
export class TemplateService {
  private templates: Map<string, Handlebars.TemplateDelegate> = new Map();
  
  // Built-in email templates
  private emailTemplates: Record<string, EmailTemplate> = {
    'VERIFICATION': verificationEmailTemplate,
    'PASSWORD_RESET': passwordResetEmailTemplate,
    'PASSWORD_RESET_SUCCESS': passwordResetSuccessTemplate,
    'WELCOME': welcomeEmailTemplate,
    // Legacy templates for backward compatibility
    'EMAIL_VERIFIED': {
      subject: 'Email Verified Successfully',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Email Verified</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f4f4f4; padding: 20px; border-radius: 0 0 5px 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Email Verified!</h1>
            </div>
            <div class="content">
              <p>Congratulations! Your email has been successfully verified.</p>
              <p>You can now enjoy all the features of Verpa:</p>
              <ul>
                <li>Create and manage your aquariums</li>
                <li>Track water parameters</li>
                <li>Set maintenance reminders</li>
                <li>Monitor fish health</li>
              </ul>
              <p>Happy fishkeeping!</p>
              <p>The Verpa Team</p>
            </div>
          </div>
        </body>
        </html>
      `,
    },
    'ACCOUNT_LOCKED': {
      subject: 'Account Security Alert',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Account Locked</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #F44336; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f4f4f4; padding: 20px; border-radius: 0 0 5px 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Account Security Alert</h1>
            </div>
            <div class="content">
              <p>Your account has been temporarily locked due to multiple failed login attempts.</p>
              <p>Your account will be automatically unlocked at: {{lockUntil}}</p>
              <p>If this wasn't you, we recommend:</p>
              <ul>
                <li>Resetting your password once your account is unlocked</li>
                <li>Enabling two-factor authentication</li>
                <li>Reviewing your recent account activity</li>
              </ul>
              <p>If you need immediate assistance, please contact our support team.</p>
              <p>Stay safe,<br>The Verpa Team</p>
            </div>
          </div>
        </body>
        </html>
      `,
    },
  };

  constructor(private readonly configService: ConfigService) {
    this.loadTemplates();
  }

  private loadTemplates() {
    // Compile Handlebars templates for legacy templates
    Object.entries(this.emailTemplates).forEach(([name, template]) => {
      if (typeof template.html === 'string') {
        this.templates.set(`${name}_html`, Handlebars.compile(template.html));
      }
      if (typeof template.text === 'string') {
        this.templates.set(`${name}_text`, Handlebars.compile(template.text));
      }
    });

    // Register additional templates
    this.registerAdditionalTemplates();
  }

  private registerAdditionalTemplates() {
    // Push notification templates
    this.templates.set('PUSH_REMINDER', Handlebars.compile(
      '{{title}}: {{message}}'
    ));

    this.templates.set('PUSH_EVENT_CONFIRMATION', Handlebars.compile(
      'Confirm {{eventType}} for {{aquariumName}}'
    ));

    this.templates.set('PUSH_MAINTENANCE_DUE', Handlebars.compile(
      '{{aquariumName}} needs {{maintenanceType}}'
    ));

    // SMS templates
    this.templates.set('SMS_VERIFICATION', Handlebars.compile(
      'Your Verpa verification code is: {{code}}'
    ));

    this.templates.set('SMS_PASSWORD_RESET', Handlebars.compile(
      'Your Verpa password reset code is: {{code}}. Valid for 10 minutes.'
    ));

    // Email notification templates
    this.templates.set('EMAIL_EVENT_REMINDER', Handlebars.compile(`
      <h2>Aquarium Event Reminder</h2>
      <p>Hi {{username}},</p>
      <p>You have a scheduled {{eventType}} for {{aquariumName}} in {{timeRemaining}}.</p>
      <p>Don't forget to complete this task!</p>
    `));

    this.templates.set('EMAIL_SUBSCRIPTION_RENEWAL', Handlebars.compile(`
      <h2>Subscription Renewal Notice</h2>
      <p>Hi {{username}},</p>
      <p>Your {{planName}} subscription will renew on {{renewalDate}}.</p>
      <p>Amount: {{amount}}</p>
    `));
  }

  getEmailTemplate(name: string): EmailTemplate | undefined {
    return this.emailTemplates[name];
  }

  renderTemplate(name: string, data: any): string {
    const template = this.templates.get(name);
    if (!template) {
      throw new Error(`Template ${name} not found`);
    }
    return template(data);
  }

  renderEmailTemplate(
    templateName: string,
    variables: any,
  ): { subject: string; html: string; text?: string } {
    const template = this.emailTemplates[templateName];
    if (!template) {
      throw new Error(`Email template ${templateName} not found`);
    }

    // Add base URL for links
    const baseUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3000');
    const apiUrl = this.configService.get('API_URL', 'http://localhost:3000');
    
    const enrichedVariables = {
      ...variables,
      baseUrl,
      apiUrl,
      verificationUrl: variables.emailVerificationToken
        ? `${baseUrl}/auth/verify-email?token=${variables.emailVerificationToken}`
        : undefined,
      resetUrl: variables.resetToken
        ? `${baseUrl}/auth/reset-password?token=${variables.resetToken}`
        : undefined,
      loginUrl: `${baseUrl}/auth/login`,
      currentYear: new Date().getFullYear(),
    };

    let html: string;
    let text: string | undefined;

    // Handle function-based templates (new style)
    if (typeof template.html === 'function') {
      html = template.html(enrichedVariables);
    } else {
      // Handle string-based templates (legacy)
      const htmlTemplate = this.templates.get(`${templateName}_html`);
      html = htmlTemplate ? htmlTemplate(enrichedVariables) : template.html;
    }

    if (template.text) {
      if (typeof template.text === 'function') {
        text = template.text(enrichedVariables);
      } else {
        const textTemplate = this.templates.get(`${templateName}_text`);
        text = textTemplate ? textTemplate(enrichedVariables) : template.text;
      }
    }

    return {
      subject: template.subject,
      html,
      text,
    };
  }

  renderPushTemplate(templateName: string, variables: any): string {
    return this.renderTemplate(`PUSH_${templateName}`, variables);
  }

  renderSmsTemplate(templateName: string, variables: any): string {
    return this.renderTemplate(`SMS_${templateName}`, variables);
  }
}
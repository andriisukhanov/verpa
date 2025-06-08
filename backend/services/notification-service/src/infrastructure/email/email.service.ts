import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import * as SendGrid from '@sendgrid/mail';
import * as nodemailer from 'nodemailer';
import { SendEmailDto } from '../../application/dto/send-email.dto';

export interface EmailResult {
  messageId: string;
  success: boolean;
  error?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly provider: string;
  private sesClient?: SESClient;
  private transporter?: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.provider = this.configService.get<string>('email.provider', 'ses');
    this.initialize();
  }

  private async initialize() {
    switch (this.provider) {
      case 'ses':
        this.initializeSES();
        break;
      case 'sendgrid':
        this.initializeSendGrid();
        break;
      case 'smtp':
        this.initializeSMTP();
        break;
      default:
        this.logger.warn(`Unknown email provider: ${this.provider}`);
    }
  }

  private initializeSES() {
    const config = this.configService.get('email.ses');
    this.sesClient = new SESClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  private initializeSendGrid() {
    const apiKey = this.configService.get<string>('email.sendgrid.apiKey');
    if (apiKey) {
      SendGrid.setApiKey(apiKey);
    }
  }

  private initializeSMTP() {
    const config = this.configService.get('email.smtp');
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
  }

  async sendEmail(dto: SendEmailDto): Promise<EmailResult> {
    try {
      const from = this.configService.get('email.from');
      const fromAddress = `${from.name} <${from.address}>`;

      switch (this.provider) {
        case 'ses':
          return await this.sendWithSES(dto, fromAddress);
        case 'sendgrid':
          return await this.sendWithSendGrid(dto, fromAddress);
        case 'smtp':
          return await this.sendWithSMTP(dto, fromAddress);
        default:
          throw new Error(`Unsupported email provider: ${this.provider}`);
      }
    } catch (error) {
      this.logger.error('Failed to send email', error);
      return {
        messageId: '',
        success: false,
        error: error.message,
      };
    }
  }

  private async sendWithSES(
    dto: SendEmailDto,
    from: string,
  ): Promise<EmailResult> {
    if (!this.sesClient) {
      throw new Error('SES client not initialized');
    }

    const command = new SendEmailCommand({
      Source: from,
      Destination: {
        ToAddresses: [dto.to],
        CcAddresses: dto.cc,
        BccAddresses: dto.bcc,
      },
      Message: {
        Subject: {
          Data: dto.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Text: dto.text
            ? {
                Data: dto.text,
                Charset: 'UTF-8',
              }
            : undefined,
          Html: dto.html
            ? {
                Data: dto.html,
                Charset: 'UTF-8',
              }
            : undefined,
        },
      },
    });

    const response = await this.sesClient.send(command);
    return {
      messageId: response.MessageId || '',
      success: true,
    };
  }

  private async sendWithSendGrid(
    dto: SendEmailDto,
    from: string,
  ): Promise<EmailResult> {
    const msg = {
      to: dto.to,
      from,
      subject: dto.subject,
      text: dto.text,
      html: dto.html,
      cc: dto.cc,
      bcc: dto.bcc,
    };

    const [response] = await SendGrid.send(msg);
    return {
      messageId: response.headers['x-message-id'] || '',
      success: response.statusCode === 202,
    };
  }

  private async sendWithSMTP(
    dto: SendEmailDto,
    from: string,
  ): Promise<EmailResult> {
    if (!this.transporter) {
      throw new Error('SMTP transporter not initialized');
    }

    const info = await this.transporter.sendMail({
      from,
      to: dto.to,
      cc: dto.cc?.join(','),
      bcc: dto.bcc?.join(','),
      subject: dto.subject,
      text: dto.text,
      html: dto.html,
      attachments: dto.attachments,
    });

    return {
      messageId: info.messageId,
      success: info.accepted.length > 0,
    };
  }

  async verifyConnection(): Promise<boolean> {
    try {
      switch (this.provider) {
        case 'smtp':
          if (this.transporter) {
            await this.transporter.verify();
            return true;
          }
          return false;
        case 'ses':
          return !!this.sesClient;
        case 'sendgrid':
          return !!this.configService.get('email.sendgrid.apiKey');
        default:
          return false;
      }
    } catch (error) {
      this.logger.error('Email connection verification failed', error);
      return false;
    }
  }
}
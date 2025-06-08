import { IsString, IsPhoneNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendSmsDto {
  @ApiProperty({ description: 'Recipient phone number' })
  @IsPhoneNumber()
  to: string;

  @ApiProperty({ description: 'SMS message content' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Template name for SMS' })
  @IsOptional()
  @IsString()
  template?: string;

  @ApiPropertyOptional({ description: 'Template variables' })
  @IsOptional()
  variables?: Record<string, any>;
}
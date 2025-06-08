import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class GetSessionsResponseDto {
  @ApiProperty({
    description: 'Session ID',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @ApiProperty({
    description: 'Device information',
    example: {
      type: 'desktop',
      browser: 'Chrome',
      os: 'Windows',
      version: '119.0.0.0',
    },
  })
  deviceInfo: {
    type: 'mobile' | 'tablet' | 'desktop' | 'unknown';
    browser?: string;
    os?: string;
    version?: string;
  };

  @ApiProperty({
    description: 'IP address',
    example: '192.168.1.1',
  })
  ipAddress: string;

  @ApiProperty({
    description: 'Location information',
    required: false,
    example: {
      country: 'United States',
      city: 'New York',
    },
  })
  location?: {
    country?: string;
    city?: string;
  };

  @ApiProperty({
    description: 'Last active timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  lastActive: Date;

  @ApiProperty({
    description: 'Session creation timestamp',
    example: '2024-01-15T09:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Whether this is the current session',
    example: true,
  })
  isCurrent: boolean;
}

export class InvalidateSessionDto {
  @ApiProperty({
    description: 'Session ID to invalidate',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}

export class InvalidateAllSessionsDto {
  @ApiProperty({
    description: 'Whether to keep the current session active',
    example: true,
    default: false,
  })
  exceptCurrent?: boolean;
}
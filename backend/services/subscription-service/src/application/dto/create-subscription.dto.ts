import { IsString, IsEmail, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PlanId {
  FREE = 'free',
  HOBBY = 'hobby',
  PRO = 'pro',
  BUSINESS = 'business',
}

export class CreateSubscriptionDto {
  @ApiProperty({ enum: PlanId, description: 'Subscription plan ID' })
  @IsEnum(PlanId)
  planId: string;

  @ApiPropertyOptional({ description: 'User email for Stripe customer creation' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Stripe customer ID if already exists' })
  @IsString()
  @IsOptional()
  stripeCustomerId?: string;

  @ApiPropertyOptional({ description: 'Stripe payment method ID for paid plans' })
  @IsString()
  @IsOptional()
  paymentMethodId?: string;

  @ApiPropertyOptional({ description: 'Skip trial period', default: false })
  @IsBoolean()
  @IsOptional()
  skipTrial?: boolean = false;
}
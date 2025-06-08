import { IsString, IsBoolean, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PlanId } from './create-subscription.dto';

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ enum: PlanId, description: 'New subscription plan ID' })
  @IsEnum(PlanId)
  @IsOptional()
  planId?: string;

  @ApiPropertyOptional({ description: 'Cancel subscription at period end' })
  @IsBoolean()
  @IsOptional()
  cancelAtPeriodEnd?: boolean;

  @ApiPropertyOptional({ description: 'Update payment method' })
  @IsString()
  @IsOptional()
  paymentMethodId?: string;
}
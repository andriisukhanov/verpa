import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddPaymentMethodDto {
  @ApiProperty({ description: 'Stripe payment method ID' })
  @IsString()
  paymentMethodId: string;

  @ApiPropertyOptional({ description: 'Set as default payment method', default: true })
  @IsOptional()
  setAsDefault?: boolean = true;
}

export class PaymentMethodResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty()
  createdAt: Date;
}
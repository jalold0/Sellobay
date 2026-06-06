import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsEnum, IsInt, IsOptional, IsPositive, IsString, IsUUID, ValidateNested } from 'class-validator';

class OrderItemDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiProperty()
  @IsInt()
  @IsPositive()
  quantity!: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @ArrayMinSize(1)
  items!: OrderItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  shippingAddressId?: string;

  @ApiProperty({ enum: ['HOME_DELIVERY', 'PICKUP_POINT', 'EXPRESS'] })
  @IsEnum(['HOME_DELIVERY', 'PICKUP_POINT', 'EXPRESS'])
  deliveryMethod: 'HOME_DELIVERY' | 'PICKUP_POINT' | 'EXPRESS' = 'HOME_DELIVERY';

  @ApiProperty({
    enum: ['CLICK', 'PAYME', 'UZUM_BANK', 'UZCARD', 'HUMO', 'VISA', 'MASTERCARD', 'CASH_ON_DELIVERY'],
  })
  @IsEnum(['CLICK', 'PAYME', 'UZUM_BANK', 'UZCARD', 'HUMO', 'VISA', 'MASTERCARD', 'CASH_ON_DELIVERY'])
  paymentProvider!:
    | 'CLICK'
    | 'PAYME'
    | 'UZUM_BANK'
    | 'UZCARD'
    | 'HUMO'
    | 'VISA'
    | 'MASTERCARD'
    | 'CASH_ON_DELIVERY';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  promoCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

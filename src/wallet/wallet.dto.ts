import { IsNumber, IsString, Min } from 'class-validator';

export class FundWalletDto {
  @IsNumber()
  @Min(100)
  amount!: number;
}

export class VerifyPaymentDto {
  @IsString()
  reference!: string;
}

export class PayoutDto {
  @IsNumber()
  @Min(1)
  amount!: number;
}

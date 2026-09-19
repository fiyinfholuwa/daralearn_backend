import { IsNumber, IsOptional, IsString, Min, Length } from 'class-validator';

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

export class BankAccountDto {
  @IsString()
  @Length(2, 100)
  bankName!: string;

  @IsString()
  @Length(1, 20)
  bankCode!: string;

  @IsOptional()
  @IsString()
  @Length(2, 150)
  accountName!: string;

  @IsString()
  @Length(6, 30)
  accountNumber!: string;
}

export class ResolveBankAccountDto {
  @IsString()
  @Length(1, 20)
  bankCode!: string;

  @IsString()
  @Length(6, 30)
  accountNumber!: string;
}

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/auth.decorators.js';
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards.js';
import type { AuthenticatedRequest } from '../auth/auth.guards.js';
import { BankAccountDto, FundWalletDto, PayoutDto, ResolveBankAccountDto, VerifyPaymentDto } from './wallet.dto.js';
import { WalletService } from './wallet.service.js';

@Controller('wallet')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get()
  walletDetails(@Req() req: AuthenticatedRequest) {
    return this.wallet.walletForUser(req.user.sub);
  }

  @Post('fund')
  @Roles(UserRole.STUDENT)
  initializeFunding(
    @Req() req: AuthenticatedRequest,
    @Body() dto: FundWalletDto,
  ) {
    return this.wallet.initializeFunding(req.user.sub, dto);
  }

  @Post('verify')
  @Roles(UserRole.STUDENT)
  verifyFunding(
    @Req() req: AuthenticatedRequest,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.wallet.verifyFunding(req.user.sub, dto);
  }

  @Post('payouts')
  @Roles(UserRole.TUTOR)
  requestPayout(@Req() req: AuthenticatedRequest, @Body() dto: PayoutDto) {
    return this.wallet.requestPayout(req.user.sub, dto);
  }

  @Get('bank-account')
  @Roles(UserRole.TUTOR)
  tutorBankAccount(@Req() req: AuthenticatedRequest) {
    return this.wallet.bankAccount(req.user.sub);
  }

  @Get('banks')
  @Roles(UserRole.TUTOR)
  banks() {
    return this.wallet.banks();
  }

  @Post('bank-account/resolve')
  @Roles(UserRole.TUTOR)
  resolveBankAccount(@Body() dto: ResolveBankAccountDto) {
    return this.wallet.resolveBankAccount(dto);
  }

  @Patch('bank-account')
  @Roles(UserRole.TUTOR)
  updateBankAccount(@Req() req: AuthenticatedRequest, @Body() dto: BankAccountDto) {
    return this.wallet.updateBankAccount(req.user.sub, dto);
  }

  @Get('payouts/me')
  @Roles(UserRole.TUTOR)
  tutorPayouts(@Req() req: AuthenticatedRequest) {
    return this.wallet.tutorPayouts(req.user.sub);
  }

  @Get('admin/payouts')
  @Roles(UserRole.ADMIN)
  payouts() {
    return this.wallet.payouts();
  }

  @Patch('admin/payouts/:id/:status')
  @Roles(UserRole.ADMIN)
  updatePayout(
    @Param('id') id: string,
    @Param('status') status: 'PROCESSING' | 'PAID' | 'REJECTED',
  ) {
    return this.wallet.updatePayout(id, status);
  }
}

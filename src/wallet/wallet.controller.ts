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
import { FundWalletDto, PayoutDto, VerifyPaymentDto } from './wallet.dto.js';
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

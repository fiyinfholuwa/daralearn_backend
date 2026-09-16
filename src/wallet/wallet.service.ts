import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../database/prisma.service.js';
import { FundWalletDto, PayoutDto, VerifyPaymentDto } from './wallet.dto.js';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async initializeFunding(userId: string, dto: FundWalletDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.emailVerifiedAt) throw new UnauthorizedException('Verify your email before making payments');
    const reference = `DL-${userId.slice(0, 8)}-${Date.now()}`;
    const transaction = await this.prisma.walletTransaction.create({
      data: {
        walletId: (await this.wallet(userId)).id,
        type: 'FUNDING',
        amount: dto.amount,
        reference,
        description: 'Wallet funding',
      },
    });
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret)
      return {
        reference,
        transactionId: transaction.id,
        checkoutUrl: null,
        message:
          'Paystack is not configured; use a test key to initialize checkout.',
      };
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: user.email,
        amount: Math.round(dto.amount * 100),
        reference,
        callback_url: process.env.PAYSTACK_CALLBACK_URL,
      },
      { headers: { Authorization: `Bearer ${secret}` } },
    );
    return {
      reference,
      transactionId: transaction.id,
      checkoutUrl: response.data.data.authorization_url,
      accessCode: response.data.data.access_code,
    };
  }

  async verifyFunding(userId: string, dto: VerifyPaymentDto) {
    const transaction = await this.prisma.walletTransaction.findUnique({
      where: { reference: dto.reference },
      include: { wallet: true },
    });
    if (!transaction || transaction.wallet.userId !== userId)
      throw new NotFoundException('Payment not found');
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { emailVerifiedAt: true } });
    if (!user?.emailVerifiedAt) throw new UnauthorizedException('Verify your email before making payments');
    if (transaction.status === 'SUCCESS') return transaction;
    if (!process.env.PAYSTACK_SECRET_KEY)
      throw new BadRequestException('Paystack is not configured');
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(dto.reference)}`,
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      },
    );
    const paystackPayment = response.data.data;
    if (
      paystackPayment.status !== 'success' ||
      Number(paystackPayment.amount) !== Math.round(Number(transaction.amount) * 100)
    )
      return this.prisma.walletTransaction.update({
        where: { id: transaction.id },
        data: { status: 'FAILED' },
      });
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.walletTransaction.updateMany({
        where: { id: transaction.id, status: 'PENDING' },
        data: { status: 'SUCCESS' },
      });

      if (claimed.count === 0) {
        return tx.walletTransaction.findUnique({ where: { id: transaction.id } });
      }

      await tx.wallet.update({
        where: { id: transaction.walletId },
        data: { balance: { increment: transaction.amount } },
      });

      return tx.walletTransaction.findUnique({ where: { id: transaction.id } });
    });
  }

  async walletForUser(userId: string) {
    return this.wallet(userId, true);
  }

  async requestPayout(userId: string, dto: PayoutDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { emailVerifiedAt: true } });
    if (!user?.emailVerifiedAt) throw new UnauthorizedException('Verify your email before requesting a payout');
    const wallet = await this.wallet(userId, true);
    if (Number(wallet.balance) < dto.amount)
      throw new BadRequestException('Insufficient available balance');
    return this.prisma.payout.create({
      data: { tutorId: userId, amount: dto.amount },
    });
  }

  payouts() {
    return this.prisma.payout.findMany({
      include: {
        tutor: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updatePayout(id: string, status: 'PROCESSING' | 'PAID' | 'REJECTED') {
    const payout = await this.prisma.payout.findUnique({ where: { id } });
    if (!payout) throw new NotFoundException('Payout not found');
    return this.prisma.payout.update({
      where: { id },
      data: { status, processedAt: status === 'PAID' ? new Date() : undefined },
    });
  }

  private async wallet(userId: string, includeTransactions = false) {
    return this.prisma.wallet.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: includeTransactions
        ? { transactions: { orderBy: { createdAt: 'desc' }, take: 50 } }
        : undefined,
    });
  }
}

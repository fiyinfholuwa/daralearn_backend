import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../database/prisma.service.js';
import { BankAccountDto, FundWalletDto, PayoutDto, ResolveBankAccountDto, VerifyPaymentDto } from './wallet.dto.js';

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
    let response;
    try {
      response = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email: user.email,
          amount: Math.round(dto.amount * 100),
          reference,
          callback_url: process.env.PAYSTACK_CALLBACK_URL,
        },
        {
          headers: { Authorization: `Bearer ${secret}` },
          timeout: 15_000,
        },
      );
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message ?? error.message
        : 'Unable to contact Paystack';
      throw new BadGatewayException(`Paystack checkout failed: ${message}`);
    }

    if (!response.data?.status || !response.data?.data?.authorization_url) {
      throw new BadGatewayException(
        response.data?.message ?? 'Paystack returned an invalid checkout response',
      );
    }
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

  bankAccount(userId: string) {
    return this.prisma.bankAccount.findUnique({ where: { userId } });
  }

  async banks() {
    if (!process.env.PAYSTACK_SECRET_KEY) throw new BadRequestException('Paystack is not configured');
    try {
      const response = await axios.get('https://api.paystack.co/bank', {
        params: { country: 'nigeria', currency: 'NGN', perPage: 100 },
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      });
      return response.data.data.map((bank: { name: string; code: string }) => ({ name: bank.name, code: bank.code }));
    } catch (error) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
      throw new BadRequestException(message ?? 'Unable to load banks from Paystack');
    }
  }

  async resolveBankAccount(dto: ResolveBankAccountDto) {
    if (!process.env.PAYSTACK_SECRET_KEY) throw new BadRequestException('Paystack is not configured');
    try {
      const response = await axios.get('https://api.paystack.co/bank/resolve', {
        params: { account_number: dto.accountNumber.trim(), bank_code: dto.bankCode.trim() },
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      });
      const accountName = response.data?.data?.account_name?.trim();
      if (!response.data?.status || !accountName) {
        throw new BadRequestException(response.data?.message ?? 'Paystack could not verify this bank account');
      }
      return { accountName };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
      throw new BadRequestException(message ?? 'Paystack could not verify this bank account');
    }
  }

  async updateBankAccount(userId: string, dto: BankAccountDto) {
    const accountNumber = dto.accountNumber.trim();
    const resolved = await this.resolveBankAccount({ bankCode: dto.bankCode, accountNumber });
    return this.prisma.bankAccount.upsert({
        where: { userId },
        create: { userId, bankName: dto.bankName.trim(), bankCode: dto.bankCode.trim(), accountName: resolved.accountName, accountNumber },
        update: { bankName: dto.bankName.trim(), bankCode: dto.bankCode.trim(), accountName: resolved.accountName, accountNumber },
      });
  }

  async requestPayout(userId: string, dto: PayoutDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { emailVerifiedAt: true } });
    if (!user?.emailVerifiedAt) throw new UnauthorizedException('Verify your email before requesting a payout');
    const wallet = await this.wallet(userId, true);
    const successfulTransactions = await this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id, status: 'SUCCESS' },
      select: { type: true, amount: true },
    });
    const ledgerBalance = successfulTransactions.reduce((total, transaction) => {
      const amount = Number(transaction.amount);
      return total + (transaction.type === 'PAYOUT' ? -amount : transaction.type === 'PAYOUT_REVERSAL' ? amount : transaction.type === 'TUTOR_EARNING' ? amount : 0);
    }, 0);
    const pendingPayouts = await this.prisma.payout.aggregate({
      where: { tutorId: userId, status: { in: ['REQUESTED', 'PROCESSING'] } },
      _sum: { amount: true },
    });
    const availableBalance = ledgerBalance - Number(pendingPayouts._sum.amount ?? 0);
    if (availableBalance < dto.amount)
      throw new BadRequestException('Insufficient available balance');
    return this.prisma.payout.create({
      data: { tutorId: userId, amount: dto.amount },
    });
  }

  tutorPayouts(userId: string) {
    return this.prisma.payout.findMany({
      where: { tutorId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  payouts() {
    return this.prisma.payout.findMany({
      include: {
        tutor: { select: { firstName: true, lastName: true, email: true, bankAccount: true } },
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

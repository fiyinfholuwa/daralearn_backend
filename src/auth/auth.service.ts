import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service.js';
import { UserRole } from '@prisma/client';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import bcrypt from 'bcrypt';
import { MailService } from './mail.service.js';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyOtpDto,
  UpdateProfileDto,
} from './auth.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists)
      throw new ConflictException('An account with this email exists');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        passwordHash,
        role: dto.role as UserRole,
        wallet: { create: {} },
        ...(dto.role === 'STUDENT'
          ? { studentProfile: { create: {} } }
          : { tutorProfile: { create: { monthlyRate: 0 } } }),
      },
    });

    await this.issueOtp(user.id, user.email);
    return {
      accessToken: await this.token(user),
      requiresEmailVerification: true,
      message: 'Account created. Check your email for the verification code.',
      user: this.safeUser(user),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.status === 'SUSPENDED')
      throw new UnauthorizedException('Account suspended');
    return {
      accessToken: await this.token(user),
      requiresEmailVerification: !user.emailVerifiedAt,
      user: this.safeUser(user),
    };
  }

  async verifyEmail(dto: VerifyOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) throw new NotFoundException('Account not found');
    const otp = await this.prisma.otpCode.findFirst({
      where: {
        userId: user.id,
        purpose: 'EMAIL_VERIFICATION',
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp || !(await bcrypt.compare(dto.code, otp.codeHash))) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }
    await this.prisma.$transaction([
      this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      }),
    ]);
    return {
      accessToken: await this.token({ ...user, emailVerifiedAt: new Date() }),
      message: 'Email verified',
    };
  }

  async resendOtp(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (user && !user.emailVerifiedAt) await this.issueOtp(user.id, user.email);
    return { message: 'A new verification code has been sent' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (user) {
      const token = randomBytes(32).toString('hex');
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: this.hash(token),
          expiresAt: new Date(Date.now() + 30 * 60_000),
        },
      });
      await this.mail.sendPasswordReset(user.email, token);
    }
    return { message: 'If the account exists, a reset link has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.hash(dto.token) },
    });
    if (!record || record.usedAt || record.expiresAt < new Date())
      throw new UnauthorizedException('Invalid or expired reset link');
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: await bcrypt.hash(dto.password, 12) },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
    return { message: 'Password updated' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (
      !user ||
      !(await bcrypt.compare(dto.currentPassword, user.passwordHash))
    )
      throw new UnauthorizedException('Current password is incorrect');
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, 12) },
    });
    return { message: 'Password updated' };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true, emailVerifiedAt: true },
    });
    if (!user) throw new NotFoundException('Account not found');
    return { ...user, emailVerified: Boolean(user.emailVerifiedAt) };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
      },
    });
    return { ...user, emailVerified: Boolean(user.emailVerifiedAt) };
  }

  private async issueOtp(userId: string, email: string) {
    const code = randomInt(100000, 1000000).toString();
    await this.prisma.otpCode.create({
      data: {
        userId,
        codeHash: await bcrypt.hash(code, 10),
        purpose: 'EMAIL_VERIFICATION',
        expiresAt: new Date(Date.now() + 10 * 60_000),
      },
    });
    await this.mail.sendOtp(email, code);
  }

  private token(user: {
    id: string;
    email: string;
    role: UserRole;
    emailVerifiedAt: Date | null;
  }) {
    return this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      emailVerified: Boolean(user.emailVerifiedAt),
    });
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private safeUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    emailVerifiedAt: Date | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      emailVerified: Boolean(user.emailVerifiedAt),
    };
  }
}

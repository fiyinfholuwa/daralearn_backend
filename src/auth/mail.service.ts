import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendOtp(email: string, code: string) {
    const host = process.env.SMTP_HOST;
    if (!host) {
      this.logger.warn(`Development OTP for ${email}: ${code}`);
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    });

    await transporter.sendMail({
      from: process.env.MAIL_FROM ?? 'DaraLearn <no-reply@daralearn.com>',
      to: email,
      subject: 'Your DaraLearn verification code',
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
    });
  }

  async sendPasswordReset(email: string, token: string) {
    const url = `${process.env.APP_URL ?? 'http://localhost:3000'}/auth/reset-password?token=${token}`;
    const host = process.env.SMTP_HOST;
    if (!host) {
      this.logger.warn(`Development password reset link for ${email}: ${url}`);
      return;
    }
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    });
    await transporter.sendMail({
      from: process.env.MAIL_FROM ?? 'DaraLearn <no-reply@daralearn.com>',
      to: email,
      subject: 'Reset your DaraLearn password',
      text: `Reset your password here: ${url}`,
    });
  }
}

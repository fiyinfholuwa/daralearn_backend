import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { emailLayout, passwordResetEmail, verificationEmail } from './email-template.js';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private transporter() {
    const host = process.env.MAIL_HOST ?? process.env.SMTP_HOST;
    const port = Number(process.env.MAIL_PORT ?? process.env.SMTP_PORT ?? 587);
    const scheme = process.env.MAIL_SCHEME?.toLowerCase();
    const secure = scheme ? scheme === 'smtps' : port === 465;

    return nodemailer.createTransport({
      host,
      port,
      secure,
      requireTLS: !secure && (scheme === 'smtp' || port === 587),
      auth: (process.env.MAIL_USERNAME ?? process.env.SMTP_USER)
        ? {
            user: process.env.MAIL_USERNAME ?? process.env.SMTP_USER,
            pass: process.env.MAIL_PASSWORD ?? process.env.SMTP_PASSWORD,
          }
        : undefined,
    });
  }

  private from() {
    const address = process.env.MAIL_FROM_ADDRESS;
    const name = process.env.MAIL_FROM_NAME;
    if (address) return name ? `${name} <${address}>` : address;
    return process.env.MAIL_FROM ?? 'DaraLearn <no-reply@daralearn.com>';
  }

  async sendOtp(email: string, code: string) {
    const host = process.env.MAIL_HOST ?? process.env.SMTP_HOST;
    if (!host) {
      if (process.env.NODE_ENV === 'production' || process.env.RENDER === 'true') {
        throw new Error('Email delivery is not configured. Set MAIL_HOST, MAIL_PORT, MAIL_USERNAME, and MAIL_PASSWORD.');
      }
      this.logger.warn(`Development OTP for ${email}: ${code}`);
      return;
    }

    await this.transporter().sendMail({
      from: this.from(),
      to: email,
      subject: 'Your DaraLearn verification code',
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
      html: verificationEmail(code),
    });
    this.logger.log(`Verification email accepted by SMTP for ${email}`);
  }

  async sendPasswordReset(email: string, token: string) {
    const url = `${process.env.APP_URL ?? 'http://localhost:3000'}/auth/reset-password?token=${token}`;
    const host = process.env.MAIL_HOST ?? process.env.SMTP_HOST;
    if (!host) {
      if (process.env.NODE_ENV === 'production' || process.env.RENDER === 'true') {
        throw new Error('Email delivery is not configured. Set MAIL_HOST, MAIL_PORT, MAIL_USERNAME, and MAIL_PASSWORD.');
      }
      this.logger.warn(`Development password reset link for ${email}: ${url}`);
      return;
    }
    await this.transporter().sendMail({
      from: this.from(),
      to: email,
      subject: 'Reset your DaraLearn password',
      text: `Reset your password here: ${url}`,
      html: passwordResetEmail(url),
    });
    this.logger.log(`Password reset email accepted by SMTP for ${email}`);
  }
}

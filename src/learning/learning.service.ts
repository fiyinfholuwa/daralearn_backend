import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import {
  InterestsDto,
  KycDto,
  TutorProfileDto,
  CreateBookingDto,
} from './learning.dto.js';

@Injectable()
export class LearningService {
  constructor(private readonly prisma: PrismaService) {}

  subjects() {
    return this.prisma.subject.findMany({ orderBy: { name: 'asc' } });
  }

  async saveInterests(userId: string, dto: InterestsDto) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });
    if (!student) throw new NotFoundException('Student profile not found');
    await this.prisma.$transaction([
      this.prisma.studentInterest.deleteMany({
        where: { studentId: student.id },
      }),
      this.prisma.studentInterest.createMany({
        data: dto.interests.map((item) => ({
          studentId: student.id,
          subjectId: item.subjectId,
          level: item.level,
        })),
      }),
    ]);
    return this.recommendations(userId);
  }

  async recommendations(userId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: { interests: true },
    });
    if (!student) throw new NotFoundException('Student profile not found');
    const subjectIds = student.interests.map((interest: { subjectId: string }) => interest.subjectId);
    return this.prisma.tutorProfile.findMany({
      where: {
        kycStatus: 'APPROVED',
        skills: { some: { subjectId: { in: subjectIds } } },
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        skills: { include: { subject: true } },
      },
      orderBy: { monthlyRate: 'asc' },
    });
  }

  tutor(id: string) {
    return this.prisma.tutorProfile.findUnique({
      where: { id },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        skills: { include: { subject: true } },
      },
    });
  }

  async updateTutor(userId: string, dto: TutorProfileDto) {
    const profile = await this.prisma.tutorProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Tutor profile not found');
    await this.prisma.$transaction([
      this.prisma.tutorProfile.update({
        where: { id: profile.id },
        data: { bio: dto.bio, monthlyRate: dto.monthlyRate },
      }),
      this.prisma.tutorSkill.deleteMany({ where: { tutorId: profile.id } }),
      this.prisma.tutorSkill.createMany({
        data: dto.subjectIds.map((subjectId) => ({
          tutorId: profile.id,
          subjectId,
        })),
      }),
    ]);
    return this.tutor(profile.id);
  }

  async submitKyc(userId: string, dto: KycDto) {
    return this.prisma.tutorProfile.update({
      where: { userId },
      data: {
        certificateUrl: dto.certificateUrl,
        kycNote: dto.note,
        kycStatus: 'PENDING',
      },
    });
  }

  async reviewKyc(id: string, status: 'APPROVED' | 'REJECTED') {
    return this.prisma.tutorProfile.update({ where: { id }, data: { kycStatus: status } });
  }

  async createBooking(userId: string, dto: CreateBookingDto) {
    const tutor = await this.prisma.tutorProfile.findUnique({
      where: { userId: dto.tutorId },
    });
    if (!tutor || tutor.kycStatus !== 'APPROVED')
      throw new BadRequestException('Tutor is not available');
    const skill = await this.prisma.tutorSkill.findUnique({
      where: {
        tutorId_subjectId: { tutorId: tutor.id, subjectId: dto.subjectId },
      },
    });
    if (!skill)
      throw new BadRequestException('Tutor does not teach this subject');
    const conflict = await this.prisma.booking.findFirst({
      where: {
        tutorId: dto.tutorId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        startsAt: { lt: new Date(dto.endsAt) },
        endsAt: { gt: new Date(dto.startsAt) },
      },
    });
    if (conflict)
      throw new BadRequestException('Tutor is already booked for this time');
    return this.prisma.booking.create({
      data: {
        studentId: userId,
        tutorId: dto.tutorId,
        subjectId: dto.subjectId,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        amount: tutor.monthlyRate,
        notes: dto.notes,
        status: 'PENDING',
      },
      include: {
        tutor: { select: { firstName: true, lastName: true } },
        subject: true,
      },
    });
  }

  async payBooking(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.studentId !== userId) throw new NotFoundException('Booking not found');
    if (booking.status !== 'PENDING') throw new BadRequestException('This booking has already been processed');

    const studentWallet = await this.prisma.wallet.upsert({ where: { userId }, create: { userId }, update: {} });
    if (Number(studentWallet.balance) < Number(booking.amount)) throw new BadRequestException('Fund your wallet before booking this session');
    const tutorWallet = await this.prisma.wallet.upsert({ where: { userId: booking.tutorId }, create: { userId: booking.tutorId }, update: {} });
    const reference = `BOOKING-${booking.id}`;

    const [, , paidBooking, subscription] = await this.prisma.$transaction([
      this.prisma.wallet.update({ where: { id: studentWallet.id }, data: { balance: { decrement: booking.amount } } }),
      this.prisma.wallet.update({ where: { id: tutorWallet.id }, data: { balance: { increment: booking.amount } } }),
      this.prisma.booking.update({ where: { id: booking.id }, data: { status: 'CONFIRMED' } }),
      this.prisma.subscription.create({ data: { bookingId: booking.id, studentId: booking.studentId, tutorId: booking.tutorId, amount: booking.amount, startsAt: booking.startsAt } }),
      this.prisma.walletTransaction.create({ data: { walletId: studentWallet.id, type: 'BOOKING_PAYMENT', status: 'SUCCESS', amount: booking.amount, reference, description: `Payment for booking ${booking.id}` } }),
      this.prisma.walletTransaction.create({ data: { walletId: tutorWallet.id, type: 'TUTOR_EARNING', status: 'SUCCESS', amount: booking.amount, reference: `EARNING-${booking.id}`, description: `Earning from booking ${booking.id}` } }),
    ]);
    return { booking: paidBooking, subscription };
  }

  async tutorEarnings(userId: string) {
    const wallet = await this.prisma.wallet.upsert({ where: { userId }, create: { userId }, update: {} });
    const transactions = await this.prisma.walletTransaction.findMany({ where: { walletId: wallet.id, type: 'TUTOR_EARNING' }, orderBy: { createdAt: 'desc' }, take: 100 });
    return { balance: wallet.balance, currency: wallet.currency, transactions };
  }

  async updateBookingStatus(userId: string, bookingId: string, status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED') {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.tutorId !== userId) throw new NotFoundException('Booking not found');
    return this.prisma.booking.update({ where: { id: bookingId }, data: { status } });
  }

  studentBookings(userId: string) {
    return this.prisma.booking.findMany({
      where: { studentId: userId },
      include: {
        tutor: { select: { firstName: true, lastName: true } },
        subject: true,
        subscription: true,
      },
      orderBy: { startsAt: 'desc' },
    });
  }
  tutorBookings(userId: string) {
    return this.prisma.booking.findMany({
      where: { tutorId: userId },
      include: {
        student: { select: { firstName: true, lastName: true, email: true } },
        subject: true,
      },
      orderBy: { startsAt: 'asc' },
    });
  }
}

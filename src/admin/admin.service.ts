import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { UpdateUserStatusDto } from './admin.dto.js';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const [users, tutors, students, pendingKyc, bookings, successfulFunding] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'TUTOR' } }),
      this.prisma.user.count({ where: { role: 'STUDENT' } }),
      this.prisma.tutorProfile.count({ where: { kycStatus: 'PENDING' } }),
      this.prisma.booking.count(),
      this.prisma.walletTransaction.aggregate({ where: { type: 'FUNDING', status: 'SUCCESS' }, _sum: { amount: true } }),
    ]);
    return { users, tutors, students, pendingKyc, bookings, fundedAmount: successfulFunding._sum.amount ?? 0 };
  }

  users(search?: string, role?: 'STUDENT' | 'TUTOR' | 'ADMIN') {
    return this.prisma.user.findMany({
      where: {
        role,
        ...(search ? { OR: [{ firstName: { contains: search, mode: 'insensitive' } }, { lastName: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] } : {}),
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true, emailVerifiedAt: true, createdAt: true, tutorProfile: { select: { id: true, kycStatus: true, monthlyRate: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUserStatus(id: string, dto: UpdateUserStatusDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({ where: { id }, data: { status: dto.status } });
  }

  pendingTutors() {
    return this.prisma.tutorProfile.findMany({ where: { kycStatus: 'PENDING' }, include: { user: { select: { id: true, firstName: true, lastName: true, email: true } }, skills: { include: { subject: true } } }, orderBy: { user: { createdAt: 'asc' } } });
  }

  bookings() {
    return this.prisma.booking.findMany({ include: { student: { select: { firstName: true, lastName: true, email: true } }, tutor: { select: { firstName: true, lastName: true, email: true } }, subject: true, subscription: true }, orderBy: { startsAt: 'desc' }, take: 100 });
  }
}

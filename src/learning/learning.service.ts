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
  CreateAssignmentDto,
  CreateClassScheduleDto,
  GradeAssignmentDto,
  SubmitAssignmentDto,
} from './learning.dto.js';

@Injectable()
export class LearningService {
  constructor(private readonly prisma: PrismaService) {}

  subjects() {
    return this.prisma.subject.findMany({ orderBy: { name: 'asc' } });
  }

  async studentInterests(userId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: { interests: { include: { subject: true } } },
    });
    if (!student) throw new NotFoundException('Student profile not found');
    return { interests: student.interests };
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
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        skills: { include: { subject: true } },
      },
    });
  }

  tutorProfile(userId: string) {
    return this.prisma.tutorProfile.findUnique({
      where: { userId },
      include: { skills: { select: { subjectId: true } } },
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
        data: { bio: dto.bio, monthlyRate: dto.monthlyRate, websiteUrl: dto.websiteUrl || null },
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

    const existingSubscription = await this.prisma.subscription.findFirst({
      where: { studentId: userId, tutorId: dto.tutorId, status: 'ACTIVE' },
    });
    if (existingSubscription)
      throw new BadRequestException('You already have an active subscription with this tutor');

    const existingBooking = await this.prisma.booking.findFirst({
      where: {
        studentId: userId,
        tutorId: dto.tutorId,
        status: 'PENDING',
      },
    });
    if (existingBooking)
      throw new BadRequestException('You already have a pending booking with this tutor');

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
    const balanceTransactions = await this.prisma.walletTransaction.findMany({
      where: {
        walletId: wallet.id,
        status: 'SUCCESS',
        type: { in: ['TUTOR_EARNING', 'PAYOUT', 'PAYOUT_REVERSAL'] },
      },
      select: { type: true, amount: true },
    });
    const ledgerBalance = balanceTransactions.reduce(
      (total, transaction) => total + (transaction.type === 'PAYOUT' ? -Number(transaction.amount) : Number(transaction.amount)),
      0,
    );
    const pendingPayouts = await this.prisma.payout.aggregate({
      where: { tutorId: userId, status: { in: ['REQUESTED', 'PROCESSING'] } },
      _sum: { amount: true },
    });
    const balance = ledgerBalance - Number(pendingPayouts._sum.amount ?? 0);
    return { balance, currency: wallet.currency, transactions };
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
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
        subject: true,
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  async createClassSchedule(userId: string, dto: CreateClassScheduleDto) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (endsAt <= startsAt) throw new BadRequestException('Class end time must be after the start time');

    const subjectSkill = await this.prisma.tutorSkill.findUnique({
      where: { tutorId_subjectId: { tutorId: (await this.prisma.tutorProfile.findUniqueOrThrow({ where: { userId } })).id, subjectId: dto.subjectId } },
    });
    if (!subjectSkill) throw new BadRequestException('You can only schedule classes for subjects on your profile');

    const confirmedStudent = await this.prisma.booking.findFirst({
      where: { tutorId: userId, subjectId: dto.subjectId, status: 'CONFIRMED' },
    });
    if (!confirmedStudent) throw new BadRequestException('You need a confirmed student booking for this subject before scheduling a class');

    return this.prisma.classSchedule.create({
      data: { tutorId: userId, subjectId: dto.subjectId, startsAt, endsAt, meetingLink: dto.meetingLink },
      include: { subject: true },
    });
  }

  tutorSchedules(userId: string) {
    return this.prisma.classSchedule.findMany({
      where: { tutorId: userId },
      include: { subject: true },
      orderBy: { startsAt: 'asc' },
    });
  }

  async studentSchedules(userId: string) {
    const confirmedBookings = await this.prisma.booking.findMany({
      where: { studentId: userId, status: 'CONFIRMED' },
      select: { tutorId: true, subjectId: true },
    });
    const pairs = confirmedBookings.map(({ tutorId, subjectId }) => ({ tutorId, subjectId }));
    if (!pairs.length) return [];

    return this.prisma.classSchedule.findMany({
      where: { OR: pairs },
      include: {
        subject: true,
        tutor: { select: { firstName: true, lastName: true } },
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  async createAssignment(userId: string, dto: CreateAssignmentDto) {
    const relationship = await this.prisma.booking.findFirst({
      where: { tutorId: userId, studentId: dto.studentId, status: 'CONFIRMED' },
    });
    if (!relationship) throw new BadRequestException('You can only assign work to your students');
    return this.prisma.assignment.create({
      data: {
        tutorId: userId,
        studentId: dto.studentId,
        title: dto.title.trim(),
        instructions: dto.instructions.trim(),
        type: dto.type,
        options: dto.options ? (Array.isArray(dto.options) ? { choices: dto.options, correctAnswer: dto.correctAnswer } : dto.options) : undefined,
        points: dto.points,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        durationMinutes: dto.durationMinutes,
      },
      include: { student: { select: { firstName: true, lastName: true, email: true } }, submission: true },
    });
  }

  tutorAssignments(userId: string) {
    return this.prisma.assignment.findMany({
      where: { tutorId: userId },
      include: { student: { select: { id: true, firstName: true, lastName: true, email: true } }, submission: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async studentAssignments(userId: string) {
    const assignments = await this.prisma.assignment.findMany({
      where: { studentId: userId },
      include: { tutor: { select: { firstName: true, lastName: true } }, submission: true },
      orderBy: { createdAt: 'desc' },
    });

    // Students need the questions and choices, but never the answer key.
    return assignments.map(({ options, ...assignment }) => {
      if (options && typeof options === 'object' && !Array.isArray(options) && 'questions' in options) {
        const quizOptions = options as { questions?: { question: string; choices: string[]; correctAnswer?: string }[] };
        return {
          ...assignment,
          options: {
            ...options,
            questions: quizOptions.questions?.map(({ correctAnswer: _correctAnswer, ...question }) => question),
          },
        };
      }

      return { ...assignment, options };
    });
  }

  async submitAssignment(userId: string, assignmentId: string, dto: SubmitAssignmentDto) {
    const assignment = await this.prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment || assignment.studentId !== userId) throw new NotFoundException('Assignment not found');
    if (assignment.dueAt && assignment.dueAt <= new Date()) throw new BadRequestException('This assignment deadline has passed');
    if (!dto.answer && !dto.fileData) throw new BadRequestException('Add an answer or upload a file');
    let answer = dto.answer;
    let score: number | undefined;
    let gradedAt: Date | undefined;
    if (assignment.type === 'OBJECTIVE' && assignment.options && typeof assignment.options === 'object' && !Array.isArray(assignment.options)) {
      const quiz = assignment.options as {
        choices?: string[];
        correctAnswer?: string;
        questions?: { question: string; choices: string[]; correctAnswer?: string }[];
      };
      if (quiz.questions?.length) {
        let selected: Record<string, string>;
        try {
          selected = JSON.parse(dto.answer ?? '{}') as Record<string, string>;
        } catch {
          throw new BadRequestException('Please answer the quiz questions before submitting');
        }
        const correct = quiz.questions.filter((question, index) => selected[index] === question.correctAnswer).length;
        score = Math.round((correct / quiz.questions.length) * assignment.points);
        gradedAt = new Date();
        answer = quiz.questions.map((question, index) => `${index + 1}. ${selected[index] ?? 'No answer'}`).join('\n');
      } else if (quiz.correctAnswer) {
        score = dto.answer === quiz.correctAnswer ? assignment.points : 0;
        gradedAt = new Date();
        answer = dto.answer;
      }
    }
    return this.prisma.assignmentSubmission.upsert({
      where: { assignmentId },
      create: { assignmentId, answer, fileName: dto.fileName, fileData: dto.fileData, score, feedback: score === undefined ? undefined : 'Automatically graded quiz', gradedAt },
      update: { answer, fileName: dto.fileName, fileData: dto.fileData, score: score ?? null, feedback: score === undefined ? null : 'Automatically graded quiz', gradedAt: gradedAt ?? null, submittedAt: new Date() },
    });
  }

  async gradeAssignment(userId: string, assignmentId: string, dto: GradeAssignmentDto) {
    const assignment = await this.prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment || assignment.tutorId !== userId) throw new NotFoundException('Assignment not found');
    if (dto.score > assignment.points) throw new BadRequestException(`Score cannot exceed ${assignment.points}`);
    return this.prisma.assignmentSubmission.update({
      where: { assignmentId },
      data: { score: dto.score, feedback: dto.feedback, gradedAt: new Date() },
    });
  }
}

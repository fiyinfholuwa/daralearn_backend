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
import {
  CreateBookingDto,
  CreateAssignmentDto,
  CreateClassScheduleDto,
  GradeAssignmentDto,
  InterestsDto,
  KycDto,
  SubmitAssignmentDto,
  TutorProfileDto,
} from './learning.dto.js';
import { LearningService } from './learning.service.js';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class LearningController {
  constructor(private readonly learning: LearningService) {}

  @Get('subjects') subjects() {
    return this.learning.subjects();
  }

  @Roles(UserRole.STUDENT)
  @Get('students/me/interests')
  interests(@Req() req: AuthenticatedRequest) {
    return this.learning.studentInterests(req.user.sub);
  }

  @Roles(UserRole.STUDENT)
  @Patch('students/me/interests')
  saveInterests(@Req() req: AuthenticatedRequest, @Body() dto: InterestsDto) {
    return this.learning.saveInterests(req.user.sub, dto);
  }

  @Roles(UserRole.STUDENT)
  @Get('students/me/recommendations')
  recommendations(@Req() req: AuthenticatedRequest) {
    return this.learning.recommendations(req.user.sub);
  }

  @Roles(UserRole.TUTOR)
  @Get('tutors/me/profile')
  tutorProfile(@Req() req: AuthenticatedRequest) {
    return this.learning.tutorProfile(req.user.sub);
  }

  @Roles(UserRole.TUTOR)
  @Patch('tutors/me/profile')
  updateTutor(@Req() req: AuthenticatedRequest, @Body() dto: TutorProfileDto) {
    return this.learning.updateTutor(req.user.sub, dto);
  }

  @Roles(UserRole.TUTOR)
  @Post('tutors/me/kyc')
  submitKyc(@Req() req: AuthenticatedRequest, @Body() dto: KycDto) {
    return this.learning.submitKyc(req.user.sub, dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch('admin/tutors/:id/kyc/:status')
  reviewKyc(@Param('id') id: string, @Param('status') status: 'APPROVED' | 'REJECTED') {
    return this.learning.reviewKyc(id, status);
  }

  @Get('tutors/:id') tutor(@Param('id') id: string) {
    return this.learning.tutor(id);
  }

  @Roles(UserRole.STUDENT)
  @Post('bookings')
  createBooking(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateBookingDto,
  ) {
    return this.learning.createBooking(req.user.sub, dto);
  }

  @Roles(UserRole.STUDENT)
  @Get('students/me/bookings')
  studentBookings(@Req() req: AuthenticatedRequest) {
    return this.learning.studentBookings(req.user.sub);
  }

  @Roles(UserRole.TUTOR)
  @Post('tutors/me/assignments')
  createAssignment(@Req() req: AuthenticatedRequest, @Body() dto: CreateAssignmentDto) {
    return this.learning.createAssignment(req.user.sub, dto);
  }

  @Roles(UserRole.TUTOR)
  @Get('tutors/me/assignments')
  tutorAssignments(@Req() req: AuthenticatedRequest) {
    return this.learning.tutorAssignments(req.user.sub);
  }

  @Roles(UserRole.TUTOR)
  @Post('tutors/me/schedules')
  createClassSchedule(@Req() req: AuthenticatedRequest, @Body() dto: CreateClassScheduleDto) {
    return this.learning.createClassSchedule(req.user.sub, dto);
  }

  @Roles(UserRole.TUTOR)
  @Get('tutors/me/schedules')
  tutorSchedules(@Req() req: AuthenticatedRequest) {
    return this.learning.tutorSchedules(req.user.sub);
  }

  @Roles(UserRole.STUDENT)
  @Get('students/me/schedules')
  studentSchedules(@Req() req: AuthenticatedRequest) {
    return this.learning.studentSchedules(req.user.sub);
  }

  @Roles(UserRole.STUDENT)
  @Get('students/me/assignments')
  studentAssignments(@Req() req: AuthenticatedRequest) {
    return this.learning.studentAssignments(req.user.sub);
  }

  @Roles(UserRole.STUDENT)
  @Post('assignments/:id/submissions')
  submitAssignment(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: SubmitAssignmentDto) {
    return this.learning.submitAssignment(req.user.sub, id, dto);
  }

  @Roles(UserRole.TUTOR)
  @Patch('assignments/:id/grade')
  gradeAssignment(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: GradeAssignmentDto) {
    return this.learning.gradeAssignment(req.user.sub, id, dto);
  }

  @Roles(UserRole.STUDENT)
  @Post('bookings/:id/pay')
  payBooking(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.learning.payBooking(req.user.sub, id);
  }

  @Roles(UserRole.TUTOR)
  @Get('tutors/me/bookings')
  tutorBookings(@Req() req: AuthenticatedRequest) {
    return this.learning.tutorBookings(req.user.sub);
  }

  @Roles(UserRole.TUTOR)
  @Get('tutors/me/earnings')
  tutorEarnings(@Req() req: AuthenticatedRequest) {
    return this.learning.tutorEarnings(req.user.sub);
  }

  @Roles(UserRole.TUTOR)
  @Patch('tutors/me/bookings/:id/:status')
  updateBookingStatus(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Param('status') status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED') {
    return this.learning.updateBookingStatus(req.user.sub, id, status);
  }
}

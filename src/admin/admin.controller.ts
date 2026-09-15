import { Controller, Get, Param, Patch, Query, UseGuards, Body } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/auth.decorators.js';
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards.js';
import { UpdateUserStatusDto } from './admin.dto.js';
import { AdminService } from './admin.service.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard') dashboard() { return this.admin.dashboard(); }

  @Get('users') users(@Query('search') search?: string, @Query('role') role?: 'STUDENT' | 'TUTOR' | 'ADMIN') { return this.admin.users(search, role); }

  @Patch('users/:id/status') updateUserStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto) { return this.admin.updateUserStatus(id, dto); }

  @Get('tutors/pending') pendingTutors() { return this.admin.pendingTutors(); }

  @Get('bookings') bookings() { return this.admin.bookings(); }
}

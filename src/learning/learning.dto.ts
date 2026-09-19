import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class InterestsDto {
  @IsArray()
  interests!: { subjectId: string; level?: string }[];
}

export class TutorProfileDto {
  @IsOptional()
  @IsString()
  bio?: string;

  @IsNumber()
  @Min(0)
  monthlyRate!: number;

  @IsArray()
  subjectIds!: string[];

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'] })
  websiteUrl?: string;
}

export class KycDto {
  @IsString()
  certificateUrl!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateBookingDto {
  @IsString()
  tutorId!: string;

  @IsString()
  subjectId!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateClassScheduleDto {
  @IsString()
  subjectId!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsUrl({ protocols: ['http', 'https'] })
  meetingLink!: string;
}

export class CreateAssignmentDto {
  @IsString()
  studentId!: string;

  @IsString()
  title!: string;

  @IsString()
  instructions!: string;

  @IsIn(['OBJECTIVE', 'ESSAY', 'UPLOAD'])
  type!: 'OBJECTIVE' | 'ESSAY' | 'UPLOAD';

  @IsOptional()
  options?: unknown;

  @IsOptional()
  @IsString()
  correctAnswer?: string;

  @IsInt()
  @Min(1)
  points!: number;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;
}

export class SubmitAssignmentDto {
  @IsOptional()
  @IsString()
  answer?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  fileData?: string;
}

export class GradeAssignmentDto {
  @IsInt()
  @Min(0)
  score!: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}

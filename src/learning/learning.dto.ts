import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
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

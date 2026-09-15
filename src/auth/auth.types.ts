import { UserRole } from '@prisma/client';

export type JwtUser = {
  sub: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
};

import type { UserRole } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export type AuthSession = {
  token: string;
  expiresAt: Date;
  user: SessionUser;
};

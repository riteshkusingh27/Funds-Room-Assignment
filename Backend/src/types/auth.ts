import type { UserRole } from "./domain";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};

export type JwtPayload = {
  sub: string;
  userId: number;
  name: string;
  email: string;
  role: UserRole;
};

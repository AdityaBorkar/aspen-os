import type { Session, User } from "./types";

type AuthSession = {
  createdAt: Date;
  expiresAt: Date;
  id: string;
  impersonatedBy?: string | null;
  ipAddress?: string | null;
  token: string;
  updatedAt: Date;
  userAgent?: string | null;
  userId: string;
};

type AuthUser = {
  banExpires?: Date | null;
  banned?: boolean | null;
  banReason?: string | null;
  createdAt: Date;
  displayUsername?: string | null;
  email: string;
  emailVerified: boolean;
  id: string;
  image?: string | null;
  name: string;
  phoneNumber?: string | null;
  phoneNumberVerified?: boolean | null;
  role?: string | null;
  updatedAt: Date;
  username?: string | null;
};

export function toUser(user: AuthUser): User {
  return {
    banExpires: user.banExpires ?? undefined,
    banned: user.banned ?? false,
    banReason: user.banReason ?? undefined,
    createdAt: user.createdAt,
    displayUsername: user.displayUsername ?? undefined,
    email: user.email,
    emailVerified: user.emailVerified,
    id: user.id,
    image: user.image ?? undefined,
    name: user.name,
    phoneNumber: user.phoneNumber ?? undefined,
    phoneNumberVerified: user.phoneNumberVerified ?? undefined,
    role: user.role ?? undefined,
    updatedAt: user.updatedAt,
    username: user.username ?? undefined,
  };
}

export function toSession(session: AuthSession): Session {
  return {
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    id: session.id,
    impersonatedBy: session.impersonatedBy ?? undefined,
    ipAddress: session.ipAddress ?? undefined,
    token: session.token,
    updatedAt: session.updatedAt,
    userAgent: session.userAgent ?? undefined,
    userId: session.userId,
  };
}

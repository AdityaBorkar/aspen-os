import type { Session, User } from "..";

export function toUser(user: any): User {
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
    twoFactorEnabled: user.twoFactorEnabled ?? false,
    updatedAt: user.updatedAt,
    username: user.username ?? undefined,
  };
}

export function toSession(session: any): Session {
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

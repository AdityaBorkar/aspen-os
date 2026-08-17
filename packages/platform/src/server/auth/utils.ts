import type { Session, User } from "./types";

/**
 * Type helper for modules to declare their auth ACL.
 *
 * Usage:
 * ```ts
 * import { defineAcl } from "@aspen-os/platform/server";
 *
 * export const acl = defineAcl({
 *   address: ["create", "read", "update", "delete", "set_primary"],
 *   bankAccount: ["create", "read", "update", "delete"],
 * });
 * ```
 */
export function defineAcl<const TAcl extends Record<string, readonly string[]>>(acl: TAcl): TAcl {
  return acl;
}

/**
 * ACL declaration type for modules.
 * Keys are resource names, values are arrays of allowed actions.
 */
export type AclDeclaration = Record<string, readonly string[]>;

/**
 * Extract resource names from an ACL declaration.
 */
export type ExtractResources<TAcl extends AclDeclaration> = keyof TAcl;

/**
 * Extract allowed actions for a given resource from an ACL declaration.
 */
export type ExtractActions<
  TAcl extends AclDeclaration,
  TResource extends keyof TAcl,
> = TAcl[TResource][number];

export interface UserInput {
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
  twoFactorEnabled?: boolean | null;
  updatedAt: Date;
  username?: string | null;
}

export interface SessionInput {
  createdAt: Date;
  expiresAt: Date;
  id: string;
  impersonatedBy?: string | null;
  ipAddress?: string | null;
  token: string;
  updatedAt: Date;
  userAgent?: string | null;
  userId: string;
}

export function toUser(user: UserInput): User {
  return {
    banExpires: user.banExpires ?? undefined,
    banReason: user.banReason ?? undefined,
    banned: user.banned ?? false,
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

export function toSession(session: SessionInput): Session {
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

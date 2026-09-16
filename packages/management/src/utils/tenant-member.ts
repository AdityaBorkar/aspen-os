export interface TenantMemberRow {
  createdAt: Date;
  email: string;
  id: string;
  name: string;
  role: string;
  userId: string;
}

export interface TenantMemberDto {
  createdAt: string;
  email: string;
  id: string;
  name: string;
  role: string;
  userId: string;
}

/**
 * Single mapper for tenant members. `createdAt` is serialized to ISO here
 * so server-direct and HTTP callers observe the same shape.
 */
export function toTenantMemberDto(row: TenantMemberRow): TenantMemberDto {
  return {
    createdAt: row.createdAt.toISOString(),
    email: row.email,
    id: row.id,
    name: row.name,
    role: row.role,
    userId: row.userId,
  };
}

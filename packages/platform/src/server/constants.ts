export const TENANT_IDS = {
  GLOBAL: "$global",
} as const;

export type GlobalTenantId = (typeof TENANT_IDS)["GLOBAL"];

export function isGlobalTenantId(
  tenantId: string | undefined,
): tenantId is GlobalTenantId {
  return tenantId === TENANT_IDS.GLOBAL;
}

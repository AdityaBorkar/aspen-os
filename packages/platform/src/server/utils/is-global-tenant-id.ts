export function isGlobalTenantId(tenantId: string | undefined) {
  return tenantId === "$global";
}

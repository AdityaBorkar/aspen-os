import { managedOrganization } from "#/db-schemas";

import { organization } from "@aspen-os/platform/server/db-schemas";

/**
 * Shared projection of a tenant/organization pair. `name`, `slug`, `logo`,
 * `metadata`, and `createdAt` come from the better-auth `organization` row;
 * the lifecycle/companion fields come from `managed_organization`. Every read
 * that surfaces a tenant should join through this shape so the two tables stay
 * consistent.
 */
export const tenantProjection = {
  branding: managedOrganization.branding,
  createdAt: organization.createdAt,
  id: organization.id,
  logo: organization.logo,
  metadata: organization.metadata,
  name: organization.name,
  plan: managedOrganization.plan,
  serviceProviderId: managedOrganization.service_provider_id,
  signupAt: managedOrganization.signup_at,
  slug: organization.slug,
  status: managedOrganization.status,
  suspendedAt: managedOrganization.suspended_at,
  suspendedReason: managedOrganization.suspended_reason,
  updatedAt: managedOrganization.updated_at,
} as const;

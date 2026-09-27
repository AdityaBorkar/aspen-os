import { managedOrganization, tenantStatusEnum } from "#/db-schemas/organization";
import { serviceProvider, serviceProviderStatusEnum } from "#/db-schemas/service-provider";
import { serviceProviderUser } from "#/db-schemas/service-provider-user";

import { organization, user } from "@aspen-os/platform/server/db-schemas";

export { managedOrganization, tenantStatusEnum } from "#/db-schemas/organization";
export { serviceProvider, serviceProviderStatusEnum } from "#/db-schemas/service-provider";
export { serviceProviderUser } from "#/db-schemas/service-provider-user";
export { organization, user };

export const control_plane_schemas = {
  managedOrganization,
  serviceProvider,
  serviceProviderStatusEnum,
  serviceProviderUser,
  tenantStatusEnum,
} as const;

export const tenant_schemas = {} as const;

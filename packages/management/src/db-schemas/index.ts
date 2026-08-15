import { serviceProvider } from "#/db-schemas/service-provider";
import { serviceProviderUser } from "#/db-schemas/service-provider-user";
import { tenant } from "#/db-schemas/tenant";

import { organization, user } from "@aspen-os/platform/server/db-schemas";

export { serviceProvider, serviceProviderStatusEnum } from "#/db-schemas/service-provider";
export { serviceProviderUser } from "#/db-schemas/service-provider-user";
export { tenant, tenantStatusEnum } from "#/db-schemas/tenant";
export { organization, user };

export const control_plane_schemas = {
  serviceProvider,
  serviceProviderUser,
  tenant,
} as const;

export const tenant_schemas = {} as const;

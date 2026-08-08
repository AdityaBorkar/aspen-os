import { organization, user } from "@aspen-os/platform/server/db-schemas";

import * as serviceProvider from "./service-provider";
import * as serviceProviderUser from "./service-provider-user";
import * as tenant from "./tenant";

export { serviceProvider, serviceProviderStatusEnum } from "./service-provider";
export { serviceProviderUser } from "./service-provider-user";
export { tenant, tenantStatusEnum } from "./tenant";
export { organization, user };

export const control_plane_schemas = {
  ...serviceProvider,
  ...serviceProviderUser,
  ...tenant,
} as const;

export const tenant_schemas = {
  organization,
  user,
} as const;

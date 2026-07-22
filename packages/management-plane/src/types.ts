import type { DatabaseConfig } from "@aspen-os/framework/server";

export type {
  AuditAction,
  AuditEntityType,
  Role,
  SpStatus,
  TenantStatus,
} from "./constants";
export type {
  ManagementPlaneEventMap,
  PlatformUserCreatedEvent,
  PlatformUserDeletedEvent,
  PlatformUserRoleAssignedEvent,
  PlatformUserUpdatedEvent,
  ServiceProviderActivatedEvent,
  ServiceProviderCreatedEvent,
  ServiceProviderDeactivatedEvent,
  ServiceProviderUpdatedEvent,
  TenantActivatedEvent,
  TenantChurnedEvent,
  TenantProfileUpdatedEvent,
  TenantProvisionedEvent,
  TenantReactivatedEvent,
  TenantSpAssignedEvent,
  TenantSpUnassignedEvent,
  TenantSuspendedEvent,
} from "./event-map";
export {
  PLATFORM_USER_EVENTS,
  SERVICE_PROVIDER_EVENTS,
  TENANT_EVENTS,
} from "./event-map";
export type {
  CreatePlatformUserInput,
  CreateServiceProviderInput,
  PlatformUserFilters,
  ProvisioningInput,
  ProvisionTenantInput,
  ServiceProviderFilters,
  TenantFilters,
  UpdatePlatformUserInput,
  UpdateServiceProviderInput,
  UpdateTenantCompanionInput,
  UpdateTenantProfileInput,
} from "./schemas";
export {
  AuditActionSchema,
  AuditEntityTypeSchema,
  CreatePlatformUserSchema,
  CreateServiceProviderSchema,
  EmailSchema,
  NameSchema,
  PlatformUserFiltersSchema,
  ProvisioningInputSchema,
  ProvisionTenantSchema,
  RoleSchema,
  ServiceProviderFiltersSchema,
  SlugSchema,
  SpStatusSchema,
  TenantFiltersSchema,
  TenantStatusSchema,
  UpdatePlatformUserSchema,
  UpdateServiceProviderSchema,
  UpdateTenantCompanionSchema,
  UpdateTenantProfileSchema,
  WebsiteSchema,
} from "./schemas";

export type ManagementPlaneConfig = {
  defaultTenantDbHost: string;
  defaultTenantDbPassword: string;
  defaultTenantDbPort: number;
  defaultTenantDbSsl: boolean;
  defaultTenantDbUser: string;
  moduleSchemas: Record<string, Record<string, unknown>>;
  postgresAdminConnection: DatabaseConfig;
  tenantDbNamingScheme: (tenantId: string) => string;
};

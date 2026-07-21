export const TENANT_EVENTS = {
  ACTIVATED: "tenant:activated",
  CHURNED: "tenant:churned",
  PROFILE_UPDATED: "tenant:profile_updated",
  PROVISIONED: "tenant:provisioned",
  REACTIVATED: "tenant:reactivated",
  SP_ASSIGNED: "tenant:sp_assigned",
  SP_UNASSIGNED: "tenant:sp_unassigned",
  SUSPENDED: "tenant:suspended",
} as const;

export const SERVICE_PROVIDER_EVENTS = {
  ACTIVATED: "service_provider:activated",
  CREATED: "service_provider:created",
  DEACTIVATED: "service_provider:deactivated",
  UPDATED: "service_provider:updated",
} as const;

export const PLATFORM_USER_EVENTS = {
  CREATED: "platform_user:created",
  DELETED: "platform_user:deleted",
  ROLE_ASSIGNED: "platform_user:role_assigned",
  UPDATED: "platform_user:updated",
} as const;

export interface TenantProvisionedEvent {
  serviceProviderId?: string;
  tenantId: string;
}

export interface TenantActivatedEvent {
  tenantId: string;
}

export interface TenantSuspendedEvent {
  reason: string;
  tenantId: string;
}

export interface TenantReactivatedEvent {
  tenantId: string;
}

export interface TenantChurnedEvent {
  reason: string;
  tenantId: string;
}

export interface TenantProfileUpdatedEvent {
  changes: Record<string, unknown>;
  tenantId: string;
}

export interface TenantSpAssignedEvent {
  serviceProviderId: string;
  tenantId: string;
}

export interface TenantSpUnassignedEvent {
  tenantId: string;
}

export interface ServiceProviderCreatedEvent {
  serviceProvider: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface ServiceProviderUpdatedEvent {
  changes: Record<string, unknown>;
  serviceProvider: {
    id: string;
    name: string;
  };
}

export interface ServiceProviderDeactivatedEvent {
  serviceProviderId: string;
}

export interface ServiceProviderActivatedEvent {
  serviceProviderId: string;
}

export interface PlatformUserCreatedEvent {
  user: {
    email: string;
    id: string;
    role: string;
  };
}

export interface PlatformUserUpdatedEvent {
  changes: Record<string, unknown>;
  userId: string;
}

export interface PlatformUserDeletedEvent {
  userId: string;
}

export interface PlatformUserRoleAssignedEvent {
  role: string;
  userId: string;
}

export type TenantEventMap = {
  [TENANT_EVENTS.PROVISIONED]: TenantProvisionedEvent;
  [TENANT_EVENTS.ACTIVATED]: TenantActivatedEvent;
  [TENANT_EVENTS.SUSPENDED]: TenantSuspendedEvent;
  [TENANT_EVENTS.REACTIVATED]: TenantReactivatedEvent;
  [TENANT_EVENTS.CHURNED]: TenantChurnedEvent;
  [TENANT_EVENTS.PROFILE_UPDATED]: TenantProfileUpdatedEvent;
  [TENANT_EVENTS.SP_ASSIGNED]: TenantSpAssignedEvent;
  [TENANT_EVENTS.SP_UNASSIGNED]: TenantSpUnassignedEvent;
};

export type ServiceProviderEventMap = {
  [SERVICE_PROVIDER_EVENTS.CREATED]: ServiceProviderCreatedEvent;
  [SERVICE_PROVIDER_EVENTS.UPDATED]: ServiceProviderUpdatedEvent;
  [SERVICE_PROVIDER_EVENTS.DEACTIVATED]: ServiceProviderDeactivatedEvent;
  [SERVICE_PROVIDER_EVENTS.ACTIVATED]: ServiceProviderActivatedEvent;
};

export type PlatformUserEventMap = {
  [PLATFORM_USER_EVENTS.CREATED]: PlatformUserCreatedEvent;
  [PLATFORM_USER_EVENTS.UPDATED]: PlatformUserUpdatedEvent;
  [PLATFORM_USER_EVENTS.DELETED]: PlatformUserDeletedEvent;
  [PLATFORM_USER_EVENTS.ROLE_ASSIGNED]: PlatformUserRoleAssignedEvent;
};

export type TenantPlatformEventMap = TenantEventMap &
  ServiceProviderEventMap &
  PlatformUserEventMap;

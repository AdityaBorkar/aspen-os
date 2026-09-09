import type {
  ContactType,
  ConnectionStatus,
  IntegrationType,
  MasterEntityKind,
  MasterEntityType,
  PaymentMethodDirection,
  PaymentMethodType,
  UomCategory,
} from "@aspen-os/constants";
import type { JsonValue } from "@aspen-os/platform/server";

export const CONTACT_EVENTS = {
  CREATED: "masters:contact_created",
  REMOVED: "masters:contact_removed",
  UPDATED: "masters:contact_updated",
} as const;

export const ADDRESS_EVENTS = {
  CREATED: "masters:address_created",
  REMOVED: "masters:address_removed",
  UPDATED: "masters:address_updated",
} as const;

export const CONNECTION_EVENTS = {
  CREATED: "masters:connection_created",
  CREDENTIAL_ROTATED: "masters:connection_credential_rotated",
  REMOVED: "masters:connection_removed",
  STATUS_CHANGED: "masters:connection_status_changed",
  UPDATED: "masters:connection_updated",
} as const;

export const ENTITY_EVENTS = {
  CREATED: "masters:entity_created",
  REMOVED: "masters:entity_removed",
  UPDATED: "masters:entity_updated",
} as const;

export const UNIT_OF_MEASURE_EVENTS = {
  CREATED: "masters:unit_of_measure_created",
  REMOVED: "masters:unit_of_measure_removed",
  UPDATED: "masters:unit_of_measure_updated",
} as const;

export const PAYMENT_METHOD_EVENTS = {
  ACTIVATED: "masters:payment_method_activated",
  CREATED: "masters:payment_method_created",
  DEACTIVATED: "masters:payment_method_deactivated",
  PRIMARY_SET: "masters:payment_method_primary_set",
  REMOVED: "masters:payment_method_removed",
  UPDATED: "masters:payment_method_updated",
} as const;

export const ORG_BRANCH_EVENTS = {
  CREATED: "masters:org_branch_created",
  UPDATED: "masters:org_branch_updated",
} as const;

export const LABEL_EVENTS = {
  APPLIED: "masters:label_applied",
  CREATED: "masters:label_created",
  REMOVED: "masters:label_removed",
  REMOVED_FROM_ENTITY: "masters:label_removed_from_entity",
  UPDATED: "masters:label_updated",
} as const;

export const events = {
  ADDRESS_EVENTS,
  CONNECTION_EVENTS,
  CONTACT_EVENTS,
  ENTITY_EVENTS,
  LABEL_EVENTS,
  ORG_BRANCH_EVENTS,
  PAYMENT_METHOD_EVENTS,
  UNIT_OF_MEASURE_EVENTS,
};

export interface OwnedResourceEvent {
  entityId: string;
  entityType: MasterEntityType;
}

export interface ContactCreatedEvent {
  contact: {
    id: string;
    name: string;
    type: ContactType;
  };
  entityType: MasterEntityType | null;
}

export interface ContactUpdatedEvent {
  changes: Record<string, JsonValue>;
  contact: { id: string; name: string };
  entityType: MasterEntityType | null;
}

export interface ContactRemovedEvent {
  contactId: string;
  entityId: string | null;
  entityType: MasterEntityType | null;
  reason: string;
}

export interface AddressCreatedEvent {
  address: { country: string; id: string; label: string | null };
  entityId: string;
  entityType: MasterEntityType;
}

export interface AddressUpdatedEvent {
  address: { id: string };
  changes: Record<string, JsonValue>;
  entityId: string;
  entityType: MasterEntityType;
}

export interface AddressRemovedEvent extends OwnedResourceEvent {
  addressId: string;
}

export interface ConnectionCreatedEvent {
  connection: {
    id: string;
    name: string;
    type: IntegrationType;
  };
  entityId: string;
  entityType: MasterEntityType;
}

export interface ConnectionUpdatedEvent extends OwnedResourceEvent {
  changes: Record<string, JsonValue>;
  connection: { id: string; name: string };
}

export interface ConnectionStatusChangedEvent {
  connectionId: string;
  fromStatus: ConnectionStatus;
  toStatus: ConnectionStatus;
}

export interface ConnectionCredentialRotatedEvent {
  connectionId: string;
}

export interface ConnectionRemovedEvent {
  connectionId: string;
  entityId: string;
  entityType: MasterEntityType;
}

export interface EntityCreatedEvent {
  entity: {
    id: string;
    name: string;
    type: MasterEntityKind;
  };
}

export interface EntityUpdatedEvent {
  changes: Record<string, JsonValue>;
  entity: {
    id: string;
    name: string;
    type: MasterEntityKind;
  };
}

export interface EntityRemovedEvent {
  entity: {
    id: string;
    name: string;
    type: MasterEntityKind;
  };
}

export interface UnitOfMeasureCreatedEvent {
  unitOfMeasure: {
    category: UomCategory;
    code: string;
    id: string;
  };
}

export interface UnitOfMeasureUpdatedEvent {
  changes: Record<string, JsonValue>;
  unitOfMeasure: {
    category: UomCategory;
    code: string;
    id: string;
  };
}

export interface UnitOfMeasureRemovedEvent {
  unitOfMeasure: {
    category: UomCategory;
    code: string;
    id: string;
  };
}

export interface PaymentMethodCreatedEvent {
  entityId: string;
  entityType: MasterEntityType;
  paymentMethod: {
    id: string;
    name: string;
    type: PaymentMethodType;
  };
}

export interface PaymentMethodUpdatedEvent {
  changes: Record<string, JsonValue>;
  entityId: string;
  entityType: MasterEntityType;
  paymentMethod: {
    id: string;
    name: string;
    type: PaymentMethodType;
  };
}

export interface PaymentMethodRemovedEvent {
  entityId: string;
  entityType: MasterEntityType;
  paymentMethod: {
    id: string;
    name: string;
    type: PaymentMethodType;
  };
}

export interface PaymentMethodActivatedEvent {
  entityId: string;
  entityType: MasterEntityType;
  paymentMethodId: string;
}

export interface PaymentMethodDeactivatedEvent {
  entityId: string;
  entityType: MasterEntityType;
  paymentMethodId: string;
}

export interface PaymentMethodPrimarySetEvent {
  direction: PaymentMethodDirection;
  entityId: string;
  entityType: MasterEntityType;
  paymentMethodId: string;
}

export interface ContactEventMap {
  [CONTACT_EVENTS.CREATED]: ContactCreatedEvent;
  [CONTACT_EVENTS.REMOVED]: ContactRemovedEvent;
  [CONTACT_EVENTS.UPDATED]: ContactUpdatedEvent;
}

export interface AddressEventMap {
  [ADDRESS_EVENTS.CREATED]: AddressCreatedEvent;
  [ADDRESS_EVENTS.REMOVED]: AddressRemovedEvent;
  [ADDRESS_EVENTS.UPDATED]: AddressUpdatedEvent;
}

export interface ConnectionEventMap {
  [CONNECTION_EVENTS.CREDENTIAL_ROTATED]: ConnectionCredentialRotatedEvent;
  [CONNECTION_EVENTS.CREATED]: ConnectionCreatedEvent;
  [CONNECTION_EVENTS.REMOVED]: ConnectionRemovedEvent;
  [CONNECTION_EVENTS.STATUS_CHANGED]: ConnectionStatusChangedEvent;
  [CONNECTION_EVENTS.UPDATED]: ConnectionUpdatedEvent;
}

export interface EntityEventMap {
  [ENTITY_EVENTS.CREATED]: EntityCreatedEvent;
  [ENTITY_EVENTS.REMOVED]: EntityRemovedEvent;
  [ENTITY_EVENTS.UPDATED]: EntityUpdatedEvent;
}

export interface UnitOfMeasureEventMap {
  [UNIT_OF_MEASURE_EVENTS.CREATED]: UnitOfMeasureCreatedEvent;
  [UNIT_OF_MEASURE_EVENTS.REMOVED]: UnitOfMeasureRemovedEvent;
  [UNIT_OF_MEASURE_EVENTS.UPDATED]: UnitOfMeasureUpdatedEvent;
}

export interface PaymentMethodEventMap {
  [PAYMENT_METHOD_EVENTS.ACTIVATED]: PaymentMethodActivatedEvent;
  [PAYMENT_METHOD_EVENTS.CREATED]: PaymentMethodCreatedEvent;
  [PAYMENT_METHOD_EVENTS.DEACTIVATED]: PaymentMethodDeactivatedEvent;
  [PAYMENT_METHOD_EVENTS.PRIMARY_SET]: PaymentMethodPrimarySetEvent;
  [PAYMENT_METHOD_EVENTS.REMOVED]: PaymentMethodRemovedEvent;
  [PAYMENT_METHOD_EVENTS.UPDATED]: PaymentMethodUpdatedEvent;
}

export interface OrgBranchCreatedEvent {
  orgBranch: {
    code: string;
    id: string;
    name: string;
    type: string;
  };
}

export interface OrgBranchUpdatedEvent {
  changes: Record<string, JsonValue>;
  orgBranch: { id: string; name: string };
}

export interface OrgBranchEventMap {
  [ORG_BRANCH_EVENTS.CREATED]: OrgBranchCreatedEvent;
  [ORG_BRANCH_EVENTS.UPDATED]: OrgBranchUpdatedEvent;
}

export interface LabelCreatedEvent {
  label: {
    color: string | null;
    id: string;
    name: string;
    scopeId: string | null;
    scopeType: string | null;
  };
}

export interface LabelUpdatedEvent {
  changes: Record<string, JsonValue>;
  label: { id: string; name: string };
}

export interface LabelRemovedEvent {
  labelId: string;
}

export interface LabelAppliedEvent {
  entityId: string;
  entityType: string;
  labelId: string;
}

export interface LabelRemovedFromEntityEvent {
  entityId: string;
  entityType: string;
  labelId: string;
}

export interface LabelEventMap {
  [LABEL_EVENTS.APPLIED]: LabelAppliedEvent;
  [LABEL_EVENTS.CREATED]: LabelCreatedEvent;
  [LABEL_EVENTS.REMOVED]: LabelRemovedEvent;
  [LABEL_EVENTS.REMOVED_FROM_ENTITY]: LabelRemovedFromEntityEvent;
  [LABEL_EVENTS.UPDATED]: LabelUpdatedEvent;
}

export type MastersEventMap = AddressEventMap &
  ConnectionEventMap &
  ContactEventMap &
  EntityEventMap &
  LabelEventMap &
  OrgBranchEventMap &
  PaymentMethodEventMap &
  UnitOfMeasureEventMap;

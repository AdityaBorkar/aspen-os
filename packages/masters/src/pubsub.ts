import type {
  ContactType,
  ConnectionStatus,
  EntityType,
  IntegrationType,
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

export const BANK_ACCOUNT_EVENTS = {
  ACTIVATED: "masters:bank_account_activated",
  CREATED: "masters:bank_account_created",
  DEACTIVATED: "masters:bank_account_deactivated",
  UPDATED: "masters:bank_account_updated",
} as const;

export const CONNECTION_EVENTS = {
  CREATED: "masters:connection_created",
  CREDENTIAL_ROTATED: "masters:connection_credential_rotated",
  REMOVED: "masters:connection_removed",
  STATUS_CHANGED: "masters:connection_status_changed",
  UPDATED: "masters:connection_updated",
} as const;

export const NOTE_EVENTS = {
  ADDED: "masters:note_added",
  REMOVED: "masters:note_removed",
} as const;

export const ENTITY_EVENTS = {
  CREATED: "masters:entity_created",
  REMOVED: "masters:entity_removed",
  UPDATED: "masters:entity_updated",
} as const;

export const UNIT_OF_MEASURE_EVENTS = {
  ACTIVATED: "masters:unit_of_measure_activated",
  CREATED: "masters:unit_of_measure_created",
  DEACTIVATED: "masters:unit_of_measure_deactivated",
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

export const events = {
  ADDRESS_EVENTS,
  BANK_ACCOUNT_EVENTS,
  CONNECTION_EVENTS,
  CONTACT_EVENTS,
  ENTITY_EVENTS,
  NOTE_EVENTS,
  PAYMENT_METHOD_EVENTS,
  UNIT_OF_MEASURE_EVENTS,
};

export interface ContactCreatedEvent {
  contact: {
    id: string;
    name: string;
    type: ContactType;
  };
  entityType: MasterEntityType;
}

export interface ContactUpdatedEvent {
  changes: Record<string, JsonValue>;
  contact: { id: string; name: string };
  entityType: MasterEntityType;
}

export interface ContactRemovedEvent {
  contactId: string;
  entityId: string;
  entityType: MasterEntityType;
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

export interface AddressRemovedEvent {
  addressId: string;
}

export interface BankAccountCreatedEvent {
  bankAccount: { bankName: string; currency: string; id: string };
  entityId: string;
  entityType: MasterEntityType;
}

export interface BankAccountActivatedEvent {
  bankAccountId: string;
}

export interface BankAccountDeactivatedEvent {
  bankAccountId: string;
}

export interface BankAccountUpdatedEvent {
  bankAccount: { id: string };
  changes: Record<string, JsonValue>;
  entityId: string;
  entityType: MasterEntityType;
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

export interface ConnectionUpdatedEvent {
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

export interface NoteAddedEvent {
  entityId: string;
  entityType: MasterEntityType;
  note: {
    content: string;
    id: string;
    type: string;
  };
}

export interface NoteRemovedEvent {
  entityId: string;
  entityType: MasterEntityType;
  noteId: string;
}

export interface EntityCreatedEvent {
  entity: {
    id: string;
    name: string;
    type: EntityType;
  };
}

export interface EntityUpdatedEvent {
  changes: Record<string, JsonValue>;
  entity: {
    id: string;
    name: string;
    type: EntityType;
  };
}

export interface EntityRemovedEvent {
  entity: {
    id: string;
    name: string;
    type: EntityType;
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

export interface UnitOfMeasureActivatedEvent {
  unitOfMeasureId: string;
}

export interface UnitOfMeasureDeactivatedEvent {
  unitOfMeasureId: string;
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

export interface BankAccountEventMap {
  [BANK_ACCOUNT_EVENTS.ACTIVATED]: BankAccountActivatedEvent;
  [BANK_ACCOUNT_EVENTS.CREATED]: BankAccountCreatedEvent;
  [BANK_ACCOUNT_EVENTS.DEACTIVATED]: BankAccountDeactivatedEvent;
  [BANK_ACCOUNT_EVENTS.UPDATED]: BankAccountUpdatedEvent;
}

export interface ConnectionEventMap {
  [CONNECTION_EVENTS.CREDENTIAL_ROTATED]: ConnectionCredentialRotatedEvent;
  [CONNECTION_EVENTS.CREATED]: ConnectionCreatedEvent;
  [CONNECTION_EVENTS.REMOVED]: ConnectionRemovedEvent;
  [CONNECTION_EVENTS.STATUS_CHANGED]: ConnectionStatusChangedEvent;
  [CONNECTION_EVENTS.UPDATED]: ConnectionUpdatedEvent;
}

export interface NoteEventMap {
  [NOTE_EVENTS.ADDED]: NoteAddedEvent;
  [NOTE_EVENTS.REMOVED]: NoteRemovedEvent;
}

export interface EntityEventMap {
  [ENTITY_EVENTS.CREATED]: EntityCreatedEvent;
  [ENTITY_EVENTS.REMOVED]: EntityRemovedEvent;
  [ENTITY_EVENTS.UPDATED]: EntityUpdatedEvent;
}

export interface UnitOfMeasureEventMap {
  [UNIT_OF_MEASURE_EVENTS.ACTIVATED]: UnitOfMeasureActivatedEvent;
  [UNIT_OF_MEASURE_EVENTS.CREATED]: UnitOfMeasureCreatedEvent;
  [UNIT_OF_MEASURE_EVENTS.DEACTIVATED]: UnitOfMeasureDeactivatedEvent;
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

export type MastersEventMap = AddressEventMap &
  BankAccountEventMap &
  ConnectionEventMap &
  ContactEventMap &
  EntityEventMap &
  NoteEventMap &
  PaymentMethodEventMap &
  UnitOfMeasureEventMap;

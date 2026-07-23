export type {
  BranchType,
  ConnectionNoteType,
  ConnectionStatus,
  ConnectionType,
  OrganizationStatus,
} from "@aspen-os/constants";

export type {
  BranchActivatedEvent,
  BranchClosedEvent,
  BranchCreatedEvent,
  BranchDeactivatedEvent,
  BranchUpdatedEvent,
  ConnectionCreatedEvent,
  ConnectionNoteAddedEvent,
  ConnectionStatusChangedEvent,
  ConnectionUpdatedEvent,
  OrganizationBrandingUpdatedEvent,
  OrganizationDomainEventMap,
  OrganizationUpdatedEvent,
} from "./pubsub-events";
export {
  BRANCH_EVENTS,
  CONNECTION_EVENTS,
  ORGANIZATION_EVENTS,
} from "./pubsub-events";
export type {
  AddressFilters,
  BankAccountFilters,
  BranchFilters,
  ConnectionFilters,
  CreateAddressInput,
  CreateBankAccountInput,
  CreateBranchInput,
  CreateConnectionContactInput,
  CreateConnectionInput,
  CreateConnectionNoteInput,
  CreateOrganizationInput,
  UpdateAddressInput,
  UpdateBankAccountInput,
  UpdateBranchInput,
  UpdateBrandingInput,
  UpdateConnectionContactInput,
  UpdateConnectionInput,
  UpdateOrganizationInput,
} from "./schemas";
export {
  AddressFiltersSchema,
  BankAccountFiltersSchema,
  BranchFiltersSchema,
  BranchTypeSchema,
  ConnectionFiltersSchema,
  ConnectionNoteTypeSchema,
  ConnectionStatusSchema,
  ConnectionTypeSchema,
  CreateAddressSchema,
  CreateBankAccountSchema,
  CreateBranchSchema,
  CreateConnectionContactSchema,
  CreateConnectionNoteSchema,
  CreateConnectionSchema,
  CreateOrganizationSchema,
  NameSchema,
  OrganizationStatusSchema,
  SlugSchema,
  UpdateAddressSchema,
  UpdateBankAccountSchema,
  UpdateBranchSchema,
  UpdateBrandingSchema,
  UpdateConnectionContactSchema,
  UpdateConnectionSchema,
  UpdateOrganizationSchema,
} from "./schemas";

export interface BranchTreeNode {
  children: BranchTreeNode[];
  id: string;
  name: string;
}

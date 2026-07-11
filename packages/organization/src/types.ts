import type {
  BranchType,
  ConnectionNoteType,
  ConnectionStatus,
  ConnectionType,
  OrganizationStatus,
} from "@aspen-os/constants";

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
export type {
  BranchType,
  ConnectionNoteType,
  ConnectionStatus,
  ConnectionType,
  OrganizationStatus,
};

export interface BranchTreeNode {
  children: BranchTreeNode[];
  id: string;
  name: string;
}

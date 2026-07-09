import type {
  BranchType,
  ComplianceCategory,
  ComplianceStatus,
  ConnectionNoteType,
  ConnectionStatus,
  ConnectionType,
  OrganizationStatus,
  RenewalFrequency,
} from "@aspen-os/constants";

export type {
  AddressFilters,
  BankAccountFilters,
  BranchFilters,
  ComplianceFilters,
  ConnectionFilters,
  CreateAddressInput,
  CreateBankAccountInput,
  CreateBranchInput,
  CreateComplianceDocumentInput,
  CreateConnectionContactInput,
  CreateConnectionInput,
  CreateConnectionNoteInput,
  CreateOrganizationInput,
  UpdateAddressInput,
  UpdateBankAccountInput,
  UpdateBranchInput,
  UpdateBrandingInput,
  UpdateComplianceDocumentInput,
  UpdateConnectionContactInput,
  UpdateConnectionInput,
  UpdateOrganizationInput,
} from "./schemas";
export {
  AddressFiltersSchema,
  BankAccountFiltersSchema,
  BranchFiltersSchema,
  BranchTypeSchema,
  ComplianceCategorySchema,
  ComplianceFiltersSchema,
  ComplianceStatusSchema,
  ConnectionFiltersSchema,
  ConnectionNoteTypeSchema,
  ConnectionStatusSchema,
  ConnectionTypeSchema,
  CreateAddressSchema,
  CreateBankAccountSchema,
  CreateBranchSchema,
  CreateComplianceDocumentSchema,
  CreateConnectionContactSchema,
  CreateConnectionNoteSchema,
  CreateConnectionSchema,
  CreateOrganizationSchema,
  NameSchema,
  OrganizationStatusSchema,
  RenewalFrequencySchema,
  SlugSchema,
  UpdateAddressSchema,
  UpdateBankAccountSchema,
  UpdateBranchSchema,
  UpdateBrandingSchema,
  UpdateComplianceDocumentSchema,
  UpdateConnectionContactSchema,
  UpdateConnectionSchema,
  UpdateOrganizationSchema,
} from "./schemas";
export type {
  BranchType,
  ComplianceCategory,
  ComplianceStatus,
  ConnectionNoteType,
  ConnectionStatus,
  ConnectionType,
  OrganizationStatus,
  RenewalFrequency,
};

export interface BranchTreeNode {
  children: BranchTreeNode[];
  id: string;
  name: string;
}

export interface ComplianceSummary {
  active: number;
  byCategory: Record<string, number>;
  expired: number;
  expiringSoon: number;
  renewalInProgress: number;
  total: number;
}

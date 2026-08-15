export type { BranchType, OrganizationStatus } from "@aspen-os/constants";

export type {
  BranchActivatedEvent,
  BranchClosedEvent,
  BranchCreatedEvent,
  BranchDeactivatedEvent,
  BranchUpdatedEvent,
  OrganizationBrandingUpdatedEvent,
  OrganizationDomainEventMap,
  OrganizationUpdatedEvent,
} from "#/pubsub";
export { BRANCH_EVENTS, ORGANIZATION_EVENTS } from "#/pubsub";
export type {
  BranchFilters,
  CreateBranchInput,
  CreateOrganizationInput,
  UpdateBranchInput,
  UpdateBrandingInput,
  UpdateOrganizationInput,
} from "#/schemas";
export {
  BranchFiltersSchema,
  BranchTypeSchema,
  CreateBranchSchema,
  CreateOrganizationSchema,
  NameSchema,
  OrganizationStatusSchema,
  SlugSchema,
  UpdateBranchSchema,
  UpdateBrandingSchema,
  UpdateOrganizationSchema,
} from "#/schemas";

export interface BranchTreeNode {
  children: BranchTreeNode[];
  id: string;
  name: string;
}

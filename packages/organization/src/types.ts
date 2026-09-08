export type { BranchType } from "@aspen-os/constants";

export type {
  BranchCreatedEvent,
  BranchUpdatedEvent,
  BranchEventMap,
  OrganizationDomainEventMap,
} from "#/pubsub";
export { BRANCH_EVENTS } from "#/pubsub";
export type { BranchFilters, CreateBranchInput, UpdateBranchInput } from "#/schemas";
export {
  BranchFiltersSchema,
  BranchTypeSchema,
  CreateBranchSchema,
  NameSchema,
  UpdateBranchSchema,
} from "#/schemas";

export interface BranchTreeNode {
  children: BranchTreeNode[];
  id: string;
  name: string;
}

import { workspaceDashboard } from "#/db-schemas/dashboard";
import { workspaceDraft } from "#/db-schemas/draft";
import { workspaceDraftComment } from "#/db-schemas/draft-comment";
import {
  workspaceAccessEnum,
  workspaceDraftStatusEnum,
  workspaceFilterViewAccessEnum,
  workspaceFilterViewTypeEnum,
  workspaceItemTypeEnum,
  workspaceWidgetTypeEnum,
} from "#/db-schemas/enums";
import { workspaceFilterView } from "#/db-schemas/filter-view";
import { workspacePin } from "#/db-schemas/pin";
import { workspaceRecent } from "#/db-schemas/recent";
import { workspaceDeliverySchedule } from "#/db-schemas/schedule";
import { workspaceWidget } from "#/db-schemas/widget";

export { workspaceDashboard } from "#/db-schemas/dashboard";
export { workspaceDraft } from "#/db-schemas/draft";
export { workspaceDraftComment } from "#/db-schemas/draft-comment";
export {
  workspaceAccessEnum,
  workspaceDraftStatusEnum,
  workspaceFilterViewAccessEnum,
  workspaceFilterViewTypeEnum,
  workspaceItemTypeEnum,
  workspaceWidgetTypeEnum,
} from "#/db-schemas/enums";
export { workspaceFilterView } from "#/db-schemas/filter-view";
export { workspacePin } from "#/db-schemas/pin";
export { workspaceRecent } from "#/db-schemas/recent";
export { workspaceDeliverySchedule } from "#/db-schemas/schedule";
export { workspaceWidget } from "#/db-schemas/widget";

export const workspaceTables = {
  workspaceDashboard,
  workspaceDeliverySchedule,
  workspaceDraft,
  workspaceDraftComment,
  workspaceFilterView,
  workspacePin,
  workspaceRecent,
  workspaceWidget,
} as const;

export const control_plane_schemas = {} as const;

// drizzle-kit's push only creates enum types listed as top-level values of
// the schema map, so every enum used by the co-located tables is included
// (same amendment as comms/announcement).
export const tenant_schemas = {
  ...workspaceTables,
  workspaceAccessEnum,
  workspaceDraftStatusEnum,
  workspaceFilterViewAccessEnum,
  workspaceFilterViewTypeEnum,
  workspaceItemTypeEnum,
  workspaceWidgetTypeEnum,
};

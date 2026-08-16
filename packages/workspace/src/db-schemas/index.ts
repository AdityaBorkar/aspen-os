import { workspaceDashboard } from "#/db-schemas/dashboard";
import { workspaceDraft } from "#/db-schemas/draft";
import { workspaceDraftComment } from "#/db-schemas/draft-comment";
import { workspacePin } from "#/db-schemas/pin";
import { workspaceRecent } from "#/db-schemas/recent";
import { workspaceSchedule } from "#/db-schemas/schedule";
import { workspaceSetting } from "#/db-schemas/setting";
import { workspaceView } from "#/db-schemas/view";
import { workspaceWatch } from "#/db-schemas/watch";
import { workspaceWidget } from "#/db-schemas/widget";

export { workspaceDashboard } from "#/db-schemas/dashboard";
export { workspaceDraft } from "#/db-schemas/draft";
export { workspaceDraftComment } from "#/db-schemas/draft-comment";
export {
  workspaceAccessEnum,
  workspaceDraftStatusEnum,
  workspaceItemTypeEnum,
  workspaceWidgetTypeEnum,
} from "#/db-schemas/enums";
export { workspacePin } from "#/db-schemas/pin";
export { workspaceRecent } from "#/db-schemas/recent";
export { workspaceSchedule } from "#/db-schemas/schedule";
export { workspaceSetting } from "#/db-schemas/setting";
export { workspaceView } from "#/db-schemas/view";
export { workspaceWatch } from "#/db-schemas/watch";
export { workspaceWidget } from "#/db-schemas/widget";

export const workspaceTables = {
  workspaceDashboard,
  workspaceDraft,
  workspaceDraftComment,
  workspacePin,
  workspaceRecent,
  workspaceSchedule,
  workspaceSetting,
  workspaceView,
  workspaceWatch,
  workspaceWidget,
} as const;

export const control_plane_schemas = {} as const;

export const tenant_schemas = workspaceTables;

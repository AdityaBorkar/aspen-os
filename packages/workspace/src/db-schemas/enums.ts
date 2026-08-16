import {
  DRAFT_STATUS,
  WIDGET_TYPE,
  WORKSPACE_ACCESS,
  WORKSPACE_ITEM_TYPE,
} from "#/utils/constants";

import { pgEnum } from "drizzle-orm/pg-core";

export const workspaceAccessEnum = pgEnum("workspace_access", [
  WORKSPACE_ACCESS.PERSONAL,
  WORKSPACE_ACCESS.GLOBAL,
]);

export const workspaceDraftStatusEnum = pgEnum("workspace_draft_status", [
  DRAFT_STATUS.DRAFT,
  DRAFT_STATUS.SUBMITTED,
  DRAFT_STATUS.APPROVED,
  DRAFT_STATUS.REJECTED,
  DRAFT_STATUS.PUBLISHED,
]);

export const workspaceWidgetTypeEnum = pgEnum("workspace_widget_type", [
  WIDGET_TYPE.METRIC,
  WIDGET_TYPE.BREAKDOWN,
  WIDGET_TYPE.LIST,
  WIDGET_TYPE.EMBED,
]);

export const workspaceItemTypeEnum = pgEnum("workspace_item_type", [
  WORKSPACE_ITEM_TYPE.DRAFT,
  WORKSPACE_ITEM_TYPE.VIEW,
  WORKSPACE_ITEM_TYPE.DASHBOARD,
]);

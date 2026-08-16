import {
  DRAFT_STATUS,
  EMBED_KIND,
  RANGE_PRESET,
  SCHEDULE_FORMAT,
  WIDGET_AGGREGATION,
  WIDGET_TYPE,
  WORKSPACE_ACCESS,
  WORKSPACE_ITEM_TYPE,
} from "#/utils/constants";

import { picklist } from "valibot";

export const WorkspaceAccessSchema = picklist(Object.values(WORKSPACE_ACCESS));

export const DraftStatusSchema = picklist(Object.values(DRAFT_STATUS));

export const WidgetTypeSchema = picklist(Object.values(WIDGET_TYPE));

export const WidgetAggregationSchema = picklist(Object.values(WIDGET_AGGREGATION));

export const EmbedKindSchema = picklist(Object.values(EMBED_KIND));

export const WorkspaceItemTypeSchema = picklist(Object.values(WORKSPACE_ITEM_TYPE));

export const RangePresetSchema = picklist(Object.values(RANGE_PRESET));

export const ScheduleFormatSchema = picklist(Object.values(SCHEDULE_FORMAT));

export {
  DRAFT_STATUS,
  EMBED_KIND,
  RANGE_PRESET,
  SCHEDULE_FORMAT,
  WIDGET_AGGREGATION,
  WIDGET_TYPE,
  WORKSPACE_ACCESS,
  WORKSPACE_ITEM_TYPE,
};

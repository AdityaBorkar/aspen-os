import { DOMAIN_REGEX } from "#/schemas/utils";
import {
  BreakdownConfigSchema,
  EmbedConfigSchema,
  ListConfigSchema,
  MetricConfigSchema,
} from "#/schemas/widget";
import type { WidgetConfig, WidgetType } from "#/types";
import { WIDGET_TYPE } from "#/utils/constants";

import { parse } from "valibot";

const WIDGET_CONFIG_SCHEMAS = {
  [WIDGET_TYPE.BREAKDOWN]: BreakdownConfigSchema,
  [WIDGET_TYPE.EMBED]: EmbedConfigSchema,
  [WIDGET_TYPE.LIST]: ListConfigSchema,
  [WIDGET_TYPE.METRIC]: MetricConfigSchema,
} as const;

export function parseWidgetConfig(type: WidgetType, config: WidgetConfig): WidgetConfig {
  return parse(WIDGET_CONFIG_SCHEMAS[type], config);
}

export function assertWidgetDatasource(
  type: WidgetType,
  input: { domain?: string | null; filter?: unknown; viewId?: string | null },
): void {
  if (type === WIDGET_TYPE.EMBED) {
    if (input.domain || input.filter || input.viewId) {
      throw new Error("Embed widgets cannot have a datasource");
    }
    return;
  }

  if (!input.domain) {
    throw new Error(`Widget type "${type}" requires a datasource domain`);
  }
  if (!DOMAIN_REGEX.test(input.domain)) {
    throw new Error("Domain must follow the <module>:<entity> convention (e.g. workspace:draft)");
  }

  const hasFilter = input.filter != null;
  const hasView = Boolean(input.viewId);
  const datasourceMessage = "A widget datasource requires exactly one of filter or viewId";
  if (!hasFilter && !hasView) {
    throw new Error(datasourceMessage);
  }
  if (hasFilter && hasView) {
    throw new Error(datasourceMessage);
  }
}

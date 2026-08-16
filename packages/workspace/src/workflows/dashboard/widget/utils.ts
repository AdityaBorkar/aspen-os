import {
  BreakdownConfigSchema,
  EmbedConfigSchema,
  ListConfigSchema,
  MetricConfigSchema,
} from "#/schemas/widget";
import type { WidgetConfig, WidgetType } from "#/types";
import { WIDGET_TYPE } from "#/utils/constants";

import { parse } from "valibot";

const DOMAIN_REGEX = /^[a-z][a-z0-9_-]*:[a-z][a-z0-9_-]*$/;

export function parseWidgetConfig(type: WidgetType, config: WidgetConfig): WidgetConfig {
  switch (type) {
    case WIDGET_TYPE.METRIC: {
      return parse(MetricConfigSchema, config);
    }
    case WIDGET_TYPE.BREAKDOWN: {
      return parse(BreakdownConfigSchema, config);
    }
    case WIDGET_TYPE.LIST: {
      return parse(ListConfigSchema, config);
    }
    case WIDGET_TYPE.EMBED: {
      return parse(EmbedConfigSchema, config);
    }
  }
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
  if (hasFilter === hasView) {
    throw new Error("A widget datasource requires exactly one of filter or viewId");
  }
}

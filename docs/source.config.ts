import { pageSchema } from "fumadocs-core/source/schema";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { z } from "zod";

const docs = {
  postprocess: { includeProcessedMarkdown: true },
  schema: pageSchema.extend({
    display: z.string().optional(),
  }),
};

export const platform = defineDocs({
  dir: `../packages/platform/docs`,
  docs,
});

export const organization = defineDocs({
  dir: `../packages/organization/docs`,
  docs,
});

export const compliance = defineDocs({
  dir: `../packages/compliance/docs`,
  docs,
});

export const hr = defineDocs({
  dir: `../packages/hr/docs`,
  docs,
});

export const dms = defineDocs({
  dir: `../packages/dms/docs`,
  docs,
});

export const constants = defineDocs({
  dir: `../packages/constants/docs`,
  docs,
});

export const comms = defineDocs({
  dir: `../packages/comms/docs`,
  docs,
});

export const tasks = defineDocs({
  dir: `../packages/tasks/docs`,
  docs,
});

export const management = defineDocs({
  dir: `../packages/management/docs`,
  docs,
});

export const masters = defineDocs({
  dir: `../packages/masters/docs`,
  docs,
});

export const crm = defineDocs({
  dir: `../packages/crm/docs`,
  docs,
});

export const fleet = defineDocs({
  dir: `../packages/fleet/docs`,
  docs,
});

export const inventory = defineDocs({
  dir: `../packages/inventory/docs`,
  docs,
});

export const reports = defineDocs({
  dir: `../packages/reports/docs`,
  docs,
});

export const workspace = defineDocs({
  dir: `../packages/workspace/docs`,
  docs,
});

export const notes = defineDocs({
  dir: `../packages/notes/docs`,
  docs,
});

export const calendar = defineDocs({
  dir: `../packages/calendar/docs`,
  docs,
});

export default defineConfig();

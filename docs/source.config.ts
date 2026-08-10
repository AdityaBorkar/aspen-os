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

export const drive = defineDocs({
  dir: `../packages/drive/docs`,
  docs,
});

export const constants = defineDocs({
  dir: `../packages/constants/docs`,
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

export const accounting = defineDocs({
  dir: `../packages/accounting/docs`,
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

export const pharmacy = defineDocs({
  dir: `../packages/pharmacy/docs`,
  docs,
});

export const reports = defineDocs({
  dir: `../packages/reports/docs`,
  docs,
});

export default defineConfig();

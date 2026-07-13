import { pageSchema } from "fumadocs-core/source/schema";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { z } from "zod";

const docs = {
  postprocess: { includeProcessedMarkdown: true },
  schema: pageSchema.extend({
    display: z.string().optional(),
  }),
};

export const framework = defineDocs({
  dir: `../packages/framework/docs-www`,
  docs,
});

export const organization = defineDocs({
  dir: `../packages/organization/docs-www`,
  docs,
});

export const compliance = defineDocs({
  dir: `../packages/compliance/docs-www`,
  docs,
});

export const hr = defineDocs({
  dir: `../packages/hr/docs-www`,
  docs,
});

export const drive = defineDocs({
  dir: `../packages/drive/docs-www`,
  docs,
});

export const constants = defineDocs({
  dir: `../packages/constants/docs-www`,
  docs,
});

export const tasks = defineDocs({
  dir: `../packages/tasks/docs-www`,
  docs,
});

export default defineConfig();

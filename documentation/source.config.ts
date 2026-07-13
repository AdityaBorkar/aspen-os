import { pageSchema } from "fumadocs-core/source/schema";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { z } from "zod";

const docsSchema = pageSchema.extend({
  display: z.string().optional(),
});

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    postprocess: {
      includeProcessedMarkdown: true,
    },
    schema: docsSchema,
  },
});

export const framework = defineDocs({
  dir: "../packages/framework/docs-www",
  docs: {
    postprocess: {
      includeProcessedMarkdown: true,
    },
    schema: docsSchema,
  },
});

export const organization = defineDocs({
  dir: "../packages/organization/docs-www",
  docs: {
    postprocess: {
      includeProcessedMarkdown: true,
    },
    schema: docsSchema,
  },
});

export const compliance = defineDocs({
  dir: "../packages/compliance/docs-www",
  docs: {
    postprocess: {
      includeProcessedMarkdown: true,
    },
    schema: docsSchema,
  },
});

export default defineConfig();

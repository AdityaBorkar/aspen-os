import { defineConfig, defineDocs } from "fumadocs-mdx/config";

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
});

export const framework = defineDocs({
  dir: "../packages/framework/docs-www",
  docs: {
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
});

export const organization = defineDocs({
  dir: "../packages/organization/docs-www",
  docs: {
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
});

export const compliance = defineDocs({
  dir: "../packages/compliance/docs-www",
  docs: {
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
});

export default defineConfig();

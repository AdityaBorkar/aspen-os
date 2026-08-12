import { Workflow } from "@aspen-os/platform/server";

import { fetchDocumentStep } from "./steps/fetch-document";

const getDocumentById = Workflow.name("document.get").handler(
  async (input: { id: string }, ctx) => {
    return ctx.step.run(fetchDocumentStep, { id: input.id });
  },
);

export { getDocumentById };

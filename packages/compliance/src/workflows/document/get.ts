import { fetchDocumentStep } from "#/workflow-steps/fetch-document";

import { Workflow } from "@aspen-os/platform/server";

const getDocumentById = Workflow.name("document.get").handler(async (input: { id: string }, ctx) =>
  ctx.step.run(fetchDocumentStep, { id: input.id }),
);

export { getDocumentById };

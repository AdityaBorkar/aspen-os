import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { IdSchema } from "../types";
import { fetchDocumentStep } from "../workflow-steps/fetch-document";

const GetInputSchema = object({ id: IdSchema });

export const getDocument = Workflow.name("dms.document.get")
  .input(GetInputSchema)
  .handler(async ({ id }, ctx) => ctx.step.run(fetchDocumentStep, { documentId: id }));

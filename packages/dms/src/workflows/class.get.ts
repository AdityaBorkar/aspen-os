import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { IdSchema } from "../types";
import { fetchDocumentClassStep } from "../workflow-steps/fetch-document-class";

const GetInputSchema = object({ id: IdSchema });

export const getDocumentClass = Workflow.name("dms.class.get")
  .input(GetInputSchema)
  .handler(async ({ id }, ctx) => ctx.step.run(fetchDocumentClassStep, { id }));

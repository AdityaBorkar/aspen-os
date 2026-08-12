import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { IdSchema } from "../types";
import { fetchDocumentStep } from "./steps/fetch-document";

const GetInputSchema = object({ id: IdSchema });

export const getDocument = Workflow.name("dms.document.get")
  .input(GetInputSchema)
  .handler(async ({ id }, ctx) => {
    return ctx.step.run(fetchDocumentStep, { documentId: id });
  });

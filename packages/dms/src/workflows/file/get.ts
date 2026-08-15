import { FileIdSchema } from "#/types";
import { fetchFileStep } from "#/workflow-steps/fetch-file";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const GetInputSchema = object({ id: FileIdSchema });

export const getFile = Workflow.name("dms.file.get")
  .input(GetInputSchema)
  .handler(async ({ id }, ctx) => ctx.step.run(fetchFileStep, { id }));

export const getFileById = getFile;

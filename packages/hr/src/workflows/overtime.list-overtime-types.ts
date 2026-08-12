import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { overtimeType } from "../db-schemas";

const InputSchema = object({});

export const listOvertimeTypes = Workflow.name(
  "hr.overtime.list-overtime-types",
)
  .input(InputSchema)
  .handler(async (input, ctx) => {
    return ctx.db.select().from(overtimeType);
  });

import { overtimeType } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({});

export const listOvertimeTypes = Workflow.name("hr.overtime.type.list")
  .input(InputSchema)
  .handler(async (_input, ctx) => ctx.db.select().from(overtimeType));

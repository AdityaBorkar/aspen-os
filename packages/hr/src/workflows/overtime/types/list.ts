import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { overtimeType } from "../../../db-schemas";

const InputSchema = object({});

export const listOvertimeTypes = Workflow.name("hr.overtime.list-overtime-types")
  .input(InputSchema)
  .handler(async (_input, ctx) => ctx.db.select().from(overtimeType));

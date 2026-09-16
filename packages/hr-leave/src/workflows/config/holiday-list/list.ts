import { holidayList } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({});

export const listHolidayLists = Workflow.name("hr.config.holiday-list.list")
  .input(InputSchema)
  .handler(async (_input, ctx) => ctx.db.select().from(holidayList));

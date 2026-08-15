import { holidayList } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({});

export const listHolidayLists = Workflow.name("hr.setup.list-holiday-lists")
  .input(InputSchema)
  .handler(async (_input, ctx) => ctx.db.select().from(holidayList));

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { holidayList } from "../db-schemas";

const InputSchema = object({});

export const listHolidayLists = Workflow.name("hr.setup.list-holiday-lists")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    return ctx.db.select().from(holidayList);
  });

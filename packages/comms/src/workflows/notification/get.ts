import { IdSchema } from "#/types";
import { fetchNotificationStep } from "#/workflow-steps/fetch-notification";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const GetInputSchema = object({ input: object({ id: IdSchema }) });

export const getNotification = Workflow.name("comms.notification.get")
  .input(GetInputSchema)
  .handler(async ({ input }, ctx) => ctx.step.run(fetchNotificationStep, { id: input.id }));

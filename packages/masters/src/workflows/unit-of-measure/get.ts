import { WithIdSchema } from "#/types";
import { fetchUnitOfMeasureStep } from "#/workflow-steps/fetch-unit-of-measure";

import { Workflow } from "@aspen-os/platform/server";

export const getUnitOfMeasure = Workflow.name("masters.unit-of-measure.get")
  .input(WithIdSchema)
  .handler(async (input, ctx) => ctx.step.run(fetchUnitOfMeasureStep, { id: input.id }));

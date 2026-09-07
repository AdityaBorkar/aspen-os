import { dmsLabel } from "#/db-schemas";
import { WithIdSchema } from "#/schemas";
import { makeFetchStep } from "#/workflow-steps/fetch-entity";

export const fetchLabelStep = makeFetchStep("dms-fetch-label", dmsLabel, "Label", WithIdSchema);

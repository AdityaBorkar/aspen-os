import { dmsClass } from "#/db-schemas";
import { WithIdSchema } from "#/schemas";
import { makeFetchStep } from "#/workflow-steps/fetch-entity";

export const fetchClassStep = makeFetchStep("dms-fetch-class", dmsClass, "Class", WithIdSchema);

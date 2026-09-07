import { dmsShare } from "#/db-schemas";
import { WithIdSchema } from "#/schemas";
import { makeFetchStep } from "#/workflow-steps/fetch-entity";

export const fetchShareStep = makeFetchStep("dms-fetch-share", dmsShare, "Share", WithIdSchema);

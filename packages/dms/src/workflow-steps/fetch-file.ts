import { dmsFile } from "#/db-schemas";
import { WithIdSchema } from "#/schemas";
import { makeFetchStep } from "#/workflow-steps/fetch-entity";

export const fetchFileStep = makeFetchStep("dms-fetch-file", dmsFile, "File", WithIdSchema);

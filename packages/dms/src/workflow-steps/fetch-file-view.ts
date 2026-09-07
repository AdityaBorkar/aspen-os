import { dmsFileView } from "#/db-schemas";
import { makeFetchStep } from "#/workflow-steps/fetch-entity";

export const fetchFileViewStep = makeFetchStep("dms-fetch-file-view", dmsFileView, "File view");

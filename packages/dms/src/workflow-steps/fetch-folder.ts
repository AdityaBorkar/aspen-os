import { dmsFolder } from "#/db-schemas";
import { makeFetchStep } from "#/workflow-steps/fetch-entity";

export const fetchFolderStep = makeFetchStep("dms-fetch-folder", dmsFolder, "Folder");

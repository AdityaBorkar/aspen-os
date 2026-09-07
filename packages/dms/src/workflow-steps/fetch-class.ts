import { dmsClass } from "#/db-schemas";
import { makeFetchStep } from "#/workflow-steps/fetch-entity";

export const fetchClassStep = makeFetchStep("dms-fetch-class", dmsClass, "Class");

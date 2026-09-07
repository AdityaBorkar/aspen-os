import { commsTemplate } from "#/db-schemas";
import { makeFetchStep } from "#/workflow-steps/fetch-by-id";

export const fetchTemplateStep = makeFetchStep(commsTemplate, "comms-fetch-template", "Template");

import { commsProvider } from "#/db-schemas";
import { makeFetchStep } from "#/workflow-steps/fetch-by-id";

export const fetchProviderStep = makeFetchStep(commsProvider, "comms-fetch-provider", "Provider");

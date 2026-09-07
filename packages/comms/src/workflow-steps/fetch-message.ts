import { commsMessage } from "#/db-schemas";
import { makeFetchStep } from "#/workflow-steps/fetch-by-id";

export const fetchMessageStep = makeFetchStep(commsMessage, "comms-fetch-message", "Message");

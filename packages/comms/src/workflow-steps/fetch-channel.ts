import { commsChannel } from "#/db-schemas";
import { makeFetchStep } from "#/workflow-steps/fetch-by-id";

export const fetchChannelStep = makeFetchStep(commsChannel, "comms-fetch-channel", "Channel");

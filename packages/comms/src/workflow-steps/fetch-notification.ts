import { commsNotification } from "#/db-schemas";
import { makeFetchStep } from "#/workflow-steps/fetch-by-id";

export const fetchNotificationStep = makeFetchStep(
  commsNotification,
  "comms-fetch-notification",
  "Notification",
);

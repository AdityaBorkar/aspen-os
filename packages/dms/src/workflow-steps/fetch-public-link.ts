import { dmsPublicLink } from "#/db-schemas";
import { makeFetchStep } from "#/workflow-steps/fetch-entity";

export const fetchPublicLinkStep = makeFetchStep(
  "dms-fetch-public-link",
  dmsPublicLink,
  "Public link",
);

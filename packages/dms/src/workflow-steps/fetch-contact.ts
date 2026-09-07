import { dmsContact } from "#/db-schemas";
import { WithIdSchema } from "#/schemas";
import { makeFetchStep } from "#/workflow-steps/fetch-entity";

export const fetchContactStep = makeFetchStep(
  "dms-fetch-contact",
  dmsContact,
  "Contact",
  WithIdSchema,
);

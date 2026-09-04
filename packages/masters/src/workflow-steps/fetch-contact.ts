import { masterContact } from "#/db-schemas";
import type { MasterContact } from "#/db-schemas/contact";
import { defineFetchByIdStep } from "#/workflow-steps/fetch-by-id";

export const fetchContactStep = defineFetchByIdStep<MasterContact>({
  idColumn: masterContact.id,
  label: "Contact",
  stepName: "masters-fetch-contact",
  table: masterContact,
});

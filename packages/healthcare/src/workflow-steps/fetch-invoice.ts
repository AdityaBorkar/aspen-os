import { healthcareInvoice } from "#/db-schemas/billing";
import { makeHealthcareFetchStep } from "#/workflow-steps/fetch-entity";

export const fetchInvoiceStep = makeHealthcareFetchStep(
  "healthcare-fetch-invoice",
  healthcareInvoice,
  "Invoice",
);

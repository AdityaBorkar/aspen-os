import { healthcareResident } from "#/db-schemas/residents";
import { makeHealthcareFetchStep } from "#/workflow-steps/fetch-entity";

export const fetchResidentStep = makeHealthcareFetchStep(
  "healthcare-fetch-resident",
  healthcareResident,
  "Resident",
);

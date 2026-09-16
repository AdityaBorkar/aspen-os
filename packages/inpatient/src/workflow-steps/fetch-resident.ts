import { healthcareResident } from "#/db-schemas/residents";
import { makeHealthcareFetchStep } from "#/workflow-steps/fetch-entity";

export const fetchResidentStep = makeHealthcareFetchStep(
  "inpatient-fetch-resident",
  healthcareResident,
  "Resident",
);

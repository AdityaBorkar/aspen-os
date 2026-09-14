import { healthcareStaff } from "#/db-schemas/staff";
import { makeHealthcareFetchStep } from "#/workflow-steps/fetch-entity";

export const fetchStaffStep = makeHealthcareFetchStep(
  "healthcare-fetch-staff",
  healthcareStaff,
  "Staff",
);

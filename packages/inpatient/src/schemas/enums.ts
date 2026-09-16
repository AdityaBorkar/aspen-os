import { DRUG_ADMIN_STATUS, RESIDENT_STATUS, TASK_STATUS } from "#/utils/constants";

import { picklist } from "valibot";

export const DrugAdminStatusSchema = picklist(Object.values(DRUG_ADMIN_STATUS));
export const ObservationProfileHintSchema = picklist([
  "encounter-intake",
  "triage",
  "bedside",
  "laboratory",
]);
export const ResidentStatusSchema = picklist(Object.values(RESIDENT_STATUS));
export const TaskStatusSchema = picklist(Object.values(TASK_STATUS));

export { DRUG_ADMIN_STATUS, RESIDENT_STATUS, TASK_STATUS } from "#/utils/constants";

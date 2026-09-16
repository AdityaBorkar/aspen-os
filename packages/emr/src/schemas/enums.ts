import { CONDITION_VERIFICATION_VALUES } from "#/fhir/registries";

import { picklist } from "valibot";

export const ConditionVerificationStatusSchema = picklist(CONDITION_VERIFICATION_VALUES);

import { sql } from "drizzle-orm";

import { complianceDocument } from "./compliance-document";
import { complianceObligation } from "./compliance-obligation";
import { complianceVerificationRule } from "./compliance-verification-rule";

export {
  type ComplianceDocument,
  complianceDocument,
  type NewComplianceDocument,
} from "./compliance-document";
export {
  type ComplianceObligation,
  complianceObligation,
  type NewComplianceObligation,
} from "./compliance-obligation";
export {
  type ComplianceVerificationRule,
  complianceVerificationRule,
  type NewComplianceVerificationRule,
} from "./compliance-verification-rule";
export { complianceCategoryEnum, verificationStatusEnum } from "./enums";
export { sql };

export const complianceTables = {
  complianceDocument,
  complianceObligation,
  complianceVerificationRule,
} as const;

export const control_plane_schemas = {} as const;

export const tenant_schemas = complianceTables;

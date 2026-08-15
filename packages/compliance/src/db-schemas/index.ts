import { complianceDocument } from "#/db-schemas/compliance-document";
import { complianceObligation } from "#/db-schemas/compliance-obligation";
import { complianceVerificationRule } from "#/db-schemas/compliance-verification-rule";

import { sql } from "drizzle-orm";

export {
  type ComplianceDocument,
  complianceDocument,
  type NewComplianceDocument,
} from "#/db-schemas/compliance-document";
export {
  type ComplianceObligation,
  complianceObligation,
  type NewComplianceObligation,
} from "#/db-schemas/compliance-obligation";
export {
  type ComplianceVerificationRule,
  complianceVerificationRule,
  type NewComplianceVerificationRule,
} from "#/db-schemas/compliance-verification-rule";
export { complianceCategoryEnum, verificationStatusEnum } from "#/db-schemas/enums";
export { sql };

export const complianceTables = {
  complianceDocument,
  complianceObligation,
  complianceVerificationRule,
} as const;

export const control_plane_schemas = {} as const;

export const tenant_schemas = complianceTables;

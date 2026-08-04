import { defineAcl } from "@aspen-os/platform/server";

export const acl = defineAcl({
  complianceAuditEntry: ["read"],
  complianceDocument: [
    "archive",
    "create",
    "delete",
    "read",
    "reject",
    "update",
    "verify",
  ],
  complianceObligation: [
    "activate",
    "create",
    "deactivate",
    "delete",
    "read",
    "update",
  ],
  complianceVerificationRule: ["create", "delete", "read", "update"],
});

export const acl = {
  complianceAuditEntry: { allowedActions: ["read"] },
  complianceDocument: {
    allowedActions: [
      "archive",
      "create",
      "delete",
      "read",
      "reject",
      "update",
      "verify",
    ],
  },
  complianceObligation: {
    allowedActions: [
      "activate",
      "create",
      "deactivate",
      "delete",
      "read",
      "update",
    ],
  },
  complianceVerificationRule: {
    allowedActions: ["create", "delete", "read", "update"],
  },
};

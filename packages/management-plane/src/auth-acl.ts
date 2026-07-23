export const acl = {
  platformUser: {
    allowedActions: ["create", "read", "update", "delete", "assign_role"],
  },
  report: { allowedActions: ["read", "generate"] },
  serviceProvider: {
    allowedActions: [
      "activate",
      "create",
      "deactivate",
      "delete",
      "read",
      "update",
    ],
  },
  tenant: {
    allowedActions: [
      "activate",
      "create",
      "delete",
      "read",
      "suspend",
      "update",
    ],
  },
};

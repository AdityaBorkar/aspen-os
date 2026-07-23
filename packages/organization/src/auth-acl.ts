export const acl = {
  address: {
    allowedActions: ["create", "read", "update", "delete", "set_primary"],
  },
  bankAccount: {
    allowedActions: [
      "activate",
      "create",
      "deactivate",
      "delete",
      "read",
      "set_primary",
      "update",
    ],
  },
  branch: {
    allowedActions: [
      "activate",
      "archive",
      "close",
      "create",
      "deactivate",
      "delete",
      "read",
      "restore",
      "update",
    ],
  },
  connection: {
    allowedActions: [
      "archive",
      "create",
      "delete",
      "manage_contacts",
      "manage_notes",
      "read",
      "restore",
      "update",
    ],
  },
  organization: {
    allowedActions: ["create", "delete", "read", "update", "update_branding"],
  },
};

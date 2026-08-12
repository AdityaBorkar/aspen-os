import { defineAcl } from "@aspen-os/platform/server";

export const acl = defineAcl({
  address: ["create", "read", "update", "delete", "set_primary"],
  bankAccount: [
    "activate",
    "create",
    "deactivate",
    "delete",
    "read",
    "set_primary",
    "update",
  ],
  branch: [
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
  connection: [
    "archive",
    "create",
    "delete",
    "manage_contacts",
    "manage_notes",
    "read",
    "restore",
    "update",
  ],
  organization: ["create", "delete", "read", "update", "update_branding"],
});

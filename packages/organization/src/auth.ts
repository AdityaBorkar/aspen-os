import { defineAcl } from "@aspen-os/platform/server";

export const acl = defineAcl({
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
  organization: ["create", "delete", "read", "update", "update_branding"],
});

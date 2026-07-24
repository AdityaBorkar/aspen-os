import { defineAcl } from "@aspen-os/platform/server";

export const acl = defineAcl({
  platformUser: ["create", "read", "update", "delete", "assign_role"],
  serviceProvider: [
    "activate",
    "create",
    "deactivate",
    "delete",
    "read",
    "update",
  ],
  tenant: ["activate", "create", "delete", "read", "suspend", "update"],
});

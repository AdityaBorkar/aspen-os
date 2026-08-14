import { defineAcl } from "@aspen-os/platform/server";

export const acl = defineAcl({
  platformUser: ["create", "delete", "read", "update"],
  serviceProvider: ["create", "delete", "read", "update"],
  tenant: ["create", "delete", "read", "update"],
});

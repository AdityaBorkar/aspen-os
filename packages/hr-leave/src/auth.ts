import { defineAcl } from "@aspen-os/platform/server";

export const acl = defineAcl({
  config: ["create", "delete", "read", "update"],
  leave: ["approve", "create", "read", "reject", "update"],
});

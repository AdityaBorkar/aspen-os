import { defineAcl } from "@aspen-os/platform/server";

export const acl = defineAcl({
  nursing: ["create", "delete", "read", "update"],
  resident: ["create", "delete", "read", "update"],
});

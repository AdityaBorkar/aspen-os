import { defineAcl } from "@aspen-os/platform/server";

export const acl = defineAcl({
  pharmacy: ["create", "delete", "read", "update"],
});

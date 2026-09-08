import { defineAcl } from "@aspen-os/platform/server";

export const acl = defineAcl({
  branch: ["create", "read", "update"],
});

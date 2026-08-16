import { defineAcl } from "@aspen-os/platform/server";

export const acl = defineAcl({
  note: ["create", "read", "update", "delete"],
});

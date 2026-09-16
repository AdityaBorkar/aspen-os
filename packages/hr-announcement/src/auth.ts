import { defineAcl } from "@aspen-os/platform/server";

export const acl = defineAcl({
  announcement: ["archive", "create", "delete", "publish", "read", "update"],
});

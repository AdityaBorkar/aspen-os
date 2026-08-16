import { defineAcl } from "@aspen-os/platform/server";

export const acl = defineAcl({
  attendee: ["create", "read", "update", "delete"],
  calendar: ["create", "read", "update", "delete", "set_default"],
  event: ["cancel", "create", "read", "update", "delete"],
  reminder: ["create", "process", "read", "update", "delete"],
});

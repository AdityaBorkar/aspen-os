import { defineAcl } from "@aspen-os/platform/server";

export const acl = defineAcl({
  attribute: ["create", "delete", "read", "update"],
  barcode: ["create", "delete", "read"],
  brand: ["create", "delete", "read", "update"],
  group: ["create", "delete", "read", "update"],
  item: ["archive", "create", "delete", "disable", "enable", "read", "update"],
  manufacturer: ["create", "delete", "read", "update"],
  reorder_rule: ["create", "delete", "disable", "enable", "read", "update"],
  setting: ["read", "update"],
  variant: ["create", "delete", "disable", "enable", "read", "sync", "update"],
});

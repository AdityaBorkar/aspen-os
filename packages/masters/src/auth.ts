import { defineAcl } from "@aspen-os/platform/server";

export const acl = defineAcl({
  address: ["create", "delete", "read", "update"],
  connection: ["check", "create", "delete", "read", "rotate_credential", "update"],
  contact: ["create", "delete", "read", "update"],
  entity: ["create", "delete", "read", "update"],
  paymentMethod: ["activate", "create", "deactivate", "delete", "read", "set_primary", "update"],
  unitOfMeasure: ["create", "delete", "read", "update"],
});

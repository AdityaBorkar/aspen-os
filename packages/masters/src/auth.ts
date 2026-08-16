import { defineAcl } from "@aspen-os/platform/server";

export const acl = defineAcl({
  address: ["create", "delete", "read", "set_primary", "update"],
  bankAccount: ["activate", "create", "deactivate", "delete", "read", "set_primary", "update"],
  connection: [
    "activate",
    "create",
    "deactivate",
    "delete",
    "read",
    "rotate_credential",
    "test",
    "update",
  ],
  contact: ["create", "delete", "read", "set_primary", "update"],
  entity: ["create", "delete", "read", "set_status", "update"],
  note: ["create", "delete", "read"],
  paymentMethod: ["activate", "create", "deactivate", "delete", "read", "set_primary", "update"],
  unitOfMeasure: ["activate", "create", "deactivate", "delete", "read", "update"],
});

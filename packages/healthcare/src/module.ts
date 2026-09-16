import { acl } from "#/auth";
import { control_plane_schemas, tenant_schemas } from "#/db-schemas";
import { events } from "#/pubsub";
import { getHealthcareConfig, setHealthcareConfig } from "#/runtime";
import type { HealthcareConfig } from "#/types";
import * as wf from "#/workflows";

import type { Module, ModuleInfra } from "@aspen-os/platform/server";

const DEFAULT_CONFIG: Required<HealthcareConfig> = {
  tenantCodePrefix: "HC",
};

export type { HealthcareConfig };

export { getHealthcareConfig };

export class Healthcare implements Module {
  static create(config?: HealthcareConfig): Healthcare {
    return new Healthcare(config ?? {});
  }

  readonly $name = "healthcare";
  // ADR-1 (HEALTHCARE-SPEC D5 consent removal): all consent write paths are
  // deleted. Shares print/WhatsApp/family-summary proceed without a grant
  // check; minor/tele psych flows lose their hard gate and rely on a charting
  // note instead; ABDM consent (grantee+purpose+range+expiry) has no home
  // until a future gateway project reintroduces it as a new bounded context.
  // Consent tables stay pushed but unwritten until the later drop (§13).
  // D6 branch pointer: healthcare resolves org meaning through masters.
  readonly $dependencies: readonly string[] = ["masters"];
  readonly $config: Required<HealthcareConfig>;

  constructor(config: HealthcareConfig) {
    this.$config = { ...DEFAULT_CONFIG, ...config };
    setHealthcareConfig(this.$config);
  }

  $prepareInfra(): ModuleInfra {
    return {
      auth: { acl },
      db: { control_plane_schemas, tenant_schemas },
      events,
    };
  }

  $initialize(): void {}

  $prepareRuntime(): void {}

  $cleanup(): void {}

  readonly admin = wf.admin;
  readonly allopathy = wf.allopathy;
  readonly appointments = wf.appointments;
  readonly ayush = wf.ayush;
  readonly billing = wf.billing;
  readonly dental = wf.dental;
  readonly diagnostics = wf.diagnostics;
  readonly encounters = wf.encounters;
  readonly facilities = wf.facilities;
  readonly nursing = wf.nursing;
  readonly operations = wf.operations;
  readonly patients = wf.patients;
  readonly pharmacy = wf.pharmacy;
  readonly practitioners = wf.practitioners;
  readonly pricelists = wf.pricelists;
  readonly psych = wf.psych;
  readonly records = wf.records;
  readonly rehab = wf.rehab;
  readonly residents = wf.residents;
  readonly services = wf.services;
}

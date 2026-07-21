import type {
  AuthUnit,
  DatabaseUnit,
  PubSubUnit,
} from "@aspen-os/framework/server";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as dbSchema from "./db-schema";
import type { TenantPlatformConfig } from "./types";
import { PlatformUserWorkflow } from "./workflows/platform-user-workflow";
import { ProvisioningWorkflow } from "./workflows/provisioning-workflow";
import { ReportWorkflow } from "./workflows/report-workflow";
import { ServiceProviderWorkflow } from "./workflows/service-provider-workflow";
import { TenantWorkflow } from "./workflows/tenant-workflow";

export * from "./types";
export type {
  AuditReportFilters,
  LifecycleReportFilters,
  TenantUsageFilters,
} from "./workflows/report-workflow";
export { dbSchema };

export class TenantPlatformModule {
  static create(config: TenantPlatformConfig): TenantPlatformModule {
    return new TenantPlatformModule(config);
  }

  constructor(private config: TenantPlatformConfig) {}

  readonly db_schema = dbSchema;
  readonly $name = "tenantPlatform";

  #tenant: TenantWorkflow | null = null;
  #serviceProvider: ServiceProviderWorkflow | null = null;
  #platformUser: PlatformUserWorkflow | null = null;
  #report: ReportWorkflow | null = null;
  #provisioning: ProvisioningWorkflow | null = null;
  #db: NodePgDatabase | null = null;

  get tenants(): TenantWorkflow {
    if (!this.#tenant) throw notInitialized();
    return this.#tenant;
  }

  get serviceProviders(): ServiceProviderWorkflow {
    if (!this.#serviceProvider) throw notInitialized();
    return this.#serviceProvider;
  }

  get platformUsers(): PlatformUserWorkflow {
    if (!this.#platformUser) throw notInitialized();
    return this.#platformUser;
  }

  get reports(): ReportWorkflow {
    if (!this.#report) throw notInitialized();
    return this.#report;
  }

  get provisioning(): ProvisioningWorkflow {
    if (!this.#provisioning) throw notInitialized();
    return this.#provisioning;
  }

  $initialize(units: {
    db: DatabaseUnit;
    auth: AuthUnit;
    pubsub: PubSubUnit;
  }): void {
    this.#db = units.db.db;
    this.#provisioning = new ProvisioningWorkflow(
      units.db.db,
      units.auth,
      units.pubsub,
      this.config,
    );
    this.#tenant = new TenantWorkflow(
      units.db.db,
      units.auth,
      units.pubsub,
      this.#provisioning,
    );
    this.#serviceProvider = new ServiceProviderWorkflow(
      units.db.db,
      units.pubsub,
    );
    this.#platformUser = new PlatformUserWorkflow(
      units.db.db,
      units.auth,
      units.pubsub,
    );
    this.#report = new ReportWorkflow(units.db.db);
  }

  async $prepare(): Promise<void> {
    if (!this.#db) throw notInitialized();

    const { pushSchema } = await import("drizzle-kit/api");
    const result = await pushSchema(dbSchema.tenantPlatformTables, this.#db);
    if (result.statementsToExecute.length > 0) {
      console.log(
        `[tenant-platform] Applying schema: ${result.statementsToExecute.length} statements`,
      );
      if (result.hasDataLoss) {
        console.warn(
          "[tenant-platform] Schema push has data loss warnings:",
          result.warnings,
        );
      }
      await result.apply();
      console.log("[tenant-platform] Schema applied");
    }
  }

  async $destroy(): Promise<void> {
    this.#tenant = null;
    this.#serviceProvider = null;
    this.#platformUser = null;
    this.#report = null;
    this.#provisioning = null;
    this.#db = null;
  }
}

function notInitialized(): Error {
  return new Error(
    "Tenant Platform module not initialized. Call $initialize() after Framework.create().",
  );
}

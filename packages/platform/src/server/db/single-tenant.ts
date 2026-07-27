import { BaseDatabaseUnit } from "./base";
import type { DatabaseConfig } from "./types";

export class SingleTenantDatabaseUnit extends BaseDatabaseUnit {
  constructor(config: DatabaseConfig) {
    super(config, "single");
  }
}

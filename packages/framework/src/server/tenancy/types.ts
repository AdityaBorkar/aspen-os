import type { DatabaseConfig } from "../db/types";

export type TenancyMode = "single" | "shared-rls" | "isolated-db";

export type TenantResolver = {
  list: () => Promise<string[]>;
  resolve: (tenantId: string) => Promise<DatabaseConfig>;
};

export type TenancyConfig =
  | { mode: "isolated-db"; tenantResolver: TenantResolver }
  | { mode: "shared-rls" }
  | { mode: "single" };

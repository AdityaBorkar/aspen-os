import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { BaseDatabaseUnit } from "./base";
import type { DatabaseConfig, SharedTenantProvisioningResult } from "./types";

type DrizzleDB = NodePgDatabase<Record<string, never>>;

export class SharedTenantDatabaseUnit extends BaseDatabaseUnit {
  constructor(config: DatabaseConfig) {
    super(config, "shared");
  }

  override async provisionTenant(
    tenantId: string,
  ): Promise<SharedTenantProvisioningResult> {
    return { tenancyMode: "shared", tenantId };
  }

  async applyRlsPolicies(db: DrizzleDB): Promise<void> {
    await db.execute(sql`
      DO $$ BEGIN
        CREATE ROLE tenant_role NOLOGIN;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await db.execute(sql`GRANT tenant_role TO current_user;`);
    await db.execute(sql`GRANT USAGE ON SCHEMA public TO tenant_role;`);
    await db.execute(
      sql`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tenant_role;`,
    );

    const tableNames = await this.discoverTenantTables(db);
    for (const tableName of tableNames) {
      await db.execute(sql`
        ALTER TABLE ${sql.identifier(tableName)} ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation ON ${sql.identifier(tableName)};
        CREATE POLICY tenant_isolation ON ${sql.identifier(tableName)}
          FOR ALL TO tenant_role
          USING (tenant_id = current_setting('app.tenant_id', true))
          WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
      `);
    }
  }

  private async discoverTenantTables(db: DrizzleDB): Promise<string[]> {
    const result = await db.execute(
      sql`
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'tenant_id'
          AND table_schema = 'public'
      `,
    );
    const rows = result.rows as Array<{ table_name: string }>;
    return rows
      .map((r) => r.table_name)
      .filter((name) => /^[a-z_][a-z0-9_]*$/.test(name));
  }
}

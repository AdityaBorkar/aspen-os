import { SCHEDULED_JOBS } from "#/utils/constants";
import { processPendingReminders } from "#/workflows/reminder/process-pending";

import type { AuditUnit, DatabaseUnit, LogUnit, PubSubUnit } from "@aspen-os/platform/server";
import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export interface ReminderDispatcherDeps {
  audit: AuditUnit;
  cron: string;
  db: PostgresJsDatabase;
  /** Isolated-tenancy routing: sweeps every tenant database. */
  dbUnit?: DatabaseUnit;
  log?: LogUnit;
  pubsub: PubSubUnit;
}

/**
 * Lists isolated tenant database names for the reminder sweep. Prefers the
 * configured resolver, falling back to `pg_database` discovery so the scan
 * keeps working when the resolver is the default empty list.
 */
export async function listReminderTenantDatabases(deps: {
  db: PostgresJsDatabase;
  dbUnit?: DatabaseUnit;
}): Promise<string[]> {
  const seen = new Set<string>();
  try {
    const ids = (await deps.dbUnit?.resolver?.list().catch((): string[] => [])) ?? [];
    // oxlint-disable eslint(no-await-in-loop)
    for (const id of ids) {
      try {
        if (deps.dbUnit) {
          seen.add(await deps.dbUnit.resolveDatabaseName(id));
        }
      } catch {
        // Ignore unresolvable ids.
      }
    }
    // oxlint-enable eslint(no-await-in-loop)
  } catch {
    // Resolver failures fall through to pg_database discovery.
  }
  try {
    const rows = await deps.db.execute<{ datname: string }>(
      sql`SELECT datname FROM pg_database WHERE datname LIKE 'tenant\\_%' ESCAPE '\\' AND datistemplate = false`,
    );
    for (const row of rows) seen.add(row.datname);
  } catch {
    // Discovery is best-effort; an empty set just skips the sweep.
  }
  return [...seen];
}

export async function scanPendingReminders(deps: ReminderDispatcherDeps): Promise<number> {
  // Calendar reminders are tenant tables (`control_plane_schemas = {}`), so
  // the $global scan alone would find nothing in isolated deployments.
  // Sweep every tenant database; each run publishes `reminder_due` with its
  // tenantId so the comms bridge can notify in the right database.
  const databases = await listReminderTenantDatabases(deps);
  let processed = 0;
  // oxlint-disable eslint/no-await-in-loop
  for (const database of databases) {
    try {
      const tenantDb = deps.dbUnit ? await deps.dbUnit.getTenantDb(database) : deps.db;
      processed += await processPendingReminders.run(undefined, {
        audit: deps.audit,
        db: tenantDb,
        log: deps.log,
        pubsub: deps.pubsub,
        tenantId: database,
      });
    } catch (error) {
      deps.log?.warn(`Reminder scan failed for database "${database}".`, {
        database,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  // oxlint-enable eslint/no-await-in-loop
  return processed;
}

export async function registerReminderDispatcher(deps: ReminderDispatcherDeps): Promise<string> {
  const topic = SCHEDULED_JOBS.REMINDER_SCAN;

  await deps.pubsub.schedule({
    cron: deps.cron,
    data: {},
    topic,
  });

  await deps.pubsub.subscribe(topic, async () => {
    await scanPendingReminders(deps);
  });

  return topic;
}

export async function unregisterReminderDispatcher(
  topic: string | null,
  { pubsub }: { pubsub: PubSubUnit },
): Promise<void> {
  if (!topic) {
    return;
  }
  try {
    await pubsub.unsubscribe(topic);
    await pubsub.unschedule(topic);
  } catch {
    // Best-effort cleanup
  }
}

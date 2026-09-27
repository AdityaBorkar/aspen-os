#!/usr/bin/env bun

import type { Module, PlatformInstance } from "#/server";
import type { DatabaseConfig } from "#/server/db";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

import { spawn } from "bun";
import { Command } from "commander";

interface StudioDbCredentials {
  database: string;
  host: string;
  password: string;
  port: number;
  ssl: boolean;
  user: string;
}

const program = new Command();

program.name("aspen").description("Aspen OS Platform CLI").version("0.1.0");

program
  .command("db-studio")
  .description("Launch Drizzle Kit Studio for database management")
  .requiredOption("-c, --config <path>", "Path to the Aspen config file")
  .option("-p, --port <port>", "Port for Drizzle Studio", "4983")
  .option("-h, --host <host>", "Host for Drizzle Studio", "0.0.0.0")
  .option(
    "-t, --tenant <tenantId>",
    "Tenant ID (isolated mode) — skips the interactive database prompt and launches Studio against that tenant's database",
  )
  .action(async (options: { config: string; host: string; port: string; tenant?: string }) => {
    const platformInstance = await loadPlatform(options.config);
    const dbConfig = platformInstance.db.config;

    if (!dbConfig) {
      console.error("Error: Could not get database configuration from platform");
      await platformInstance.$cleanup().catch(() => {});
      process.exit(1);
    }

    const credentials = await resolveStudioCredentials(platformInstance, dbConfig, options.tenant);

    // The platform instance holds open postgres pools which keep the event
    // loop alive. Studio runs as a separate process with its own connection,
    // so release the pools before spawning it.
    await platformInstance.$cleanup().catch(() => {});

    const configDir = await mkdtemp(join(tmpdir(), "aspen-db-studio-"));
    const configPath = join(configDir, "drizzle.config.ts");
    try {
      await writeFile(configPath, renderDrizzleConfig(credentials));
      console.log(`Launching Drizzle Studio for database "${credentials.database}"...`);
      const exitCode = await runStudio(configPath, options.host, options.port);
      process.exit(exitCode);
    } finally {
      await rm(configDir, { force: true, recursive: true });
    }
  });

program
  .command("tenants")
  .description("List all tenants (isolated mode)")
  .requiredOption("-c, --config <path>", "Path to the Aspen config file")
  .action(async (options: { config: string }) => {
    const platformInstance = await loadPlatform(options.config);

    try {
      if (!platformInstance.db.resolver) {
        console.error("Error: Tenants command is only available in isolated mode");
        process.exit(1);
      }

      const tenantIds = await platformInstance.db.resolver.list();
      console.log(`Found ${tenantIds.length} tenant(s):`);
      for (const id of tenantIds) {
        console.log(`  - ${id}`);
      }
    } finally {
      // Release postgres pools so the process exits instead of hanging.
      await platformInstance.$cleanup().catch(() => {});
    }
    process.exit(0);
  });

await program.parseAsync();

async function resolveStudioCredentials(
  platformInstance: PlatformInstance<Module[]>,
  dbConfig: DatabaseConfig,
  tenantFlag: string | undefined,
): Promise<StudioDbCredentials> {
  if (tenantFlag !== undefined) {
    return resolveTenantCredentials(platformInstance, dbConfig, tenantFlag);
  }

  if (platformInstance.db.tenancyMode !== "isolated") {
    return controlPlaneCredentials(dbConfig);
  }

  const selection = await promptDatabaseSelection(dbConfig.database);
  if (selection.kind === "control") {
    return controlPlaneCredentials(dbConfig);
  }
  return resolveTenantCredentials(platformInstance, dbConfig, selection.tenantId);
}

function controlPlaneCredentials(dbConfig: DatabaseConfig): StudioDbCredentials {
  return {
    database: dbConfig.database,
    host: dbConfig.host,
    password: dbConfig.password,
    port: dbConfig.port,
    ssl: dbConfig.ssl ?? false,
    user: dbConfig.user,
  };
}

async function resolveTenantCredentials(
  platformInstance: PlatformInstance<Module[]>,
  dbConfig: DatabaseConfig,
  tenantId: string,
): Promise<StudioDbCredentials> {
  const database = await resolveTenantDatabase(platformInstance, tenantId);
  return {
    database,
    host: platformInstance.db.tenantDbDefaults?.host ?? dbConfig.host,
    password: platformInstance.db.tenantDbDefaults?.password ?? dbConfig.password,
    port: platformInstance.db.tenantDbDefaults?.port ?? dbConfig.port,
    ssl: platformInstance.db.tenantDbDefaults?.ssl ?? dbConfig.ssl ?? false,
    user: platformInstance.db.tenantDbDefaults?.user ?? dbConfig.user,
  };
}

async function resolveTenantDatabase(
  platformInstance: PlatformInstance<Module[]>,
  tenantId: string,
): Promise<string> {
  try {
    return await platformInstance.db.resolveDatabaseName(tenantId);
  } catch (error) {
    console.error(
      `Warning: tenant database resolution failed for "${tenantId}", falling back to naming convention (${error instanceof Error ? error.message : String(error)})`,
    );
  }
  const prefix = platformInstance.db.tenantDbPrefix;
  return prefix ? `${prefix}_${tenantId}` : tenantId;
}

type DatabaseSelection = { kind: "control" } | { kind: "tenant"; tenantId: string };

async function promptDatabaseSelection(controlDbName: string): Promise<DatabaseSelection> {
  if (!process.stdin.isTTY) {
    return { kind: "control" };
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log("Select database for Drizzle Studio:");
    console.log(`  1) Control Plane DB (${controlDbName})`);
    console.log("  2) Enter Tenant ID");
    const rawChoice = await rl.question("Enter choice [1/2] (default: 1): ");
    const choice = rawChoice.trim();
    if (choice === "" || choice === "1") {
      return { kind: "control" };
    }
    if (choice !== "2") {
      console.log(`Unrecognized choice "${choice}", using Control Plane DB.`);
      return { kind: "control" };
    }
    const rawTenantId = await rl.question("Enter Tenant ID: ");
    const tenantId = rawTenantId.trim();
    if (tenantId === "") {
      console.error("Error: Tenant ID must not be empty");
      process.exit(1);
    }
    return { kind: "tenant", tenantId };
  } finally {
    rl.close();
  }
}

/**
 * Render a dependency-free drizzle-kit config (plain object, no imports) so
 * it loads regardless of where the temp dir lives relative to node_modules.
 * Studio introspects the live database, so no schema export is needed.
 */
function renderDrizzleConfig(credentials: StudioDbCredentials): string {
  const ssl = credentials.ssl ? "{ rejectUnauthorized: false }" : "false";
  return `// Generated by \`aspen db-studio\`; do not edit.
export default {
  dialect: "postgresql",
  dbCredentials: {
    database: ${JSON.stringify(credentials.database)},
    host: ${JSON.stringify(credentials.host)},
    password: ${JSON.stringify(credentials.password)},
    port: ${credentials.port},
    ssl: ${ssl},
    user: ${JSON.stringify(credentials.user)},
  },
};
`;
}

/** Spawn Drizzle Kit Studio as a child process; resolves with its exit code. */
async function runStudio(configPath: string, host: string, port: string): Promise<number> {
  const command = await resolveStudioCommand();
  console.log(`Starting Drizzle Studio on http://${host}:${port} (${command.join(" ")})`);
  const child = spawn(
    [...command, "studio", "--config", configPath, "--port", port, "--host", host],
    {
      env: { ...process.env },
      stdio: ["inherit", "inherit", "inherit"],
    },
  );

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      child.kill(signal);
    });
  }

  await child.exited;

  if (child.signalCode) {
    process.kill(process.pid, child.signalCode);
    return 1;
  }
  return child.exitCode ?? 1;
}

/**
 * Prefer a drizzle-kit installed alongside @aspen-os/platform (so Studio's
 * drizzle-orm version check resolves against the platform's own install).
 * The drizzle-kit exports map hides ./bin.cjs, so locate the file directly
 * instead of resolving the subpath. Fall back to bunx (app-local install)
 * when no alongside copy is found.
 */
function resolveStudioCommand(): Promise<string[]> {
  return findDrizzleKitBin().then((binPath) =>
    binPath ? ["bun", binPath] : ["bunx", "drizzle-kit"],
  );
}

/** Search ancestors of the CLI entrypoint and cwd for drizzle-kit's bin. */
async function findDrizzleKitBin(): Promise<string | null> {
  const roots = [dirname(fileURLToPath(import.meta.url)), process.cwd()];
  const candidates = roots.flatMap((root) => ancestorBinCandidates(root));
  const hits = await Promise.all(
    candidates.map(async (candidate) => ((await pathExists(candidate)) ? candidate : null)),
  );
  return hits.find((hit) => hit !== null) ?? null;
}

function ancestorBinCandidates(root: string): string[] {
  const candidates: string[] = [];
  let dir: string | null = root;
  while (dir !== null) {
    candidates.push(join(dir, "node_modules", "drizzle-kit", "bin.cjs"));
    const parent = dirname(dir);
    dir = parent === dir ? null : parent;
  }
  return candidates;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function loadPlatform(configPath: string): Promise<PlatformInstance<Module[]>> {
  const resolvedPath = resolve(process.cwd(), configPath);
  try {
    const mod = await import(resolvedPath);
    const platformInstance = mod.platform || mod.p || mod.pm;
    if (platformInstance) {
      return platformInstance;
    }
    console.error(`Error: No 'platform' export found in ${resolvedPath}`);
    return process.exit(1);
  } catch (error) {
    console.error(`Error: Failed to load config from ${resolvedPath}`);
    console.error(error);
    return process.exit(1);
  }
}

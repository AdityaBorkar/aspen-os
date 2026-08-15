#!/usr/bin/env bun

import type { Module, PlatformInstance } from "#/server";
import { resolve } from "node:path";

import { Command } from "commander";
import { startStudioPostgresServer } from "drizzle-kit/api";

const program = new Command();

program.name("aspen").description("Aspen OS Platform CLI").version("0.1.0");

async function loadPlatform(configPath: string): Promise<PlatformInstance<Module[]>> {
  const resolvedPath = resolve(process.cwd(), configPath);
  try {
    const mod = await import(resolvedPath);
    const platformInstance = mod.platform || mod.p;
    if (!platformInstance) {
      console.error(`Error: No 'platform' export found in ${resolvedPath}`);
      process.exit(1);
    }
    return platformInstance;
  } catch (error) {
    console.error(`Error: Failed to load config from ${resolvedPath}`);
    console.error(error);
    process.exit(1);
  }
}

program
  .command("db-studio")
  .description("Launch Drizzle Kit Studio for database management")
  .requiredOption("-c, --config <path>", "Path to the Aspen config file")
  .option("-p, --port <port>", "Port for Drizzle Studio", "4983")
  .option("-h, --host <host>", "Host for Drizzle Studio", "0.0.0.0")
  .option(
    "-t, --tenant <tenantId>",
    "Tenant ID (isolated mode) — launches Studio against that tenant's database",
  )
  .action(async (options: { config: string; host: string; port: string; tenant?: string }) => {
    const platformInstance = await loadPlatform(options.config);

    if (options.tenant && platformInstance.db.resolver) {
      const tenantConfig = await platformInstance.db.resolver.resolve(options.tenant);
      await startStudioPostgresServer(platformInstance.db.getSchemas(), tenantConfig);
      return;
    }

    if (!platformInstance.db.config) {
      console.error("Error: Could not get database configuration from platform");
      process.exit(1);
    }

    await startStudioPostgresServer(platformInstance.db.getSchemas(), platformInstance.db.config);
  });

program
  .command("tenants")
  .description("List all tenants (isolated mode)")
  .requiredOption("-c, --config <path>", "Path to the Aspen config file")
  .action(async (options: { config: string }) => {
    const platformInstance = await loadPlatform(options.config);

    if (!platformInstance.db.resolver) {
      console.error("Error: Tenants command is only available in isolated mode");
      process.exit(1);
    }

    const tenantIds = await platformInstance.db.resolver.list();
    console.log(`Found ${tenantIds.length} tenant(s):`);
    for (const id of tenantIds) {
      console.log(`  - ${id}`);
    }
  });

program.parse();

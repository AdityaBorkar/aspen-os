#!/usr/bin/env bun

import { resolve } from "node:path";

import { Command } from "commander";
import { startStudioPostgresServer } from "drizzle-kit/api";

import type { FrameworkInstance, Module } from "../server/index";

const program = new Command();

program.name("aspen").description("Aspen OS Framework CLI").version("0.1.0");

async function loadFramework(
  configPath: string,
): Promise<FrameworkInstance<Record<string, Module>>> {
  const resolvedPath = resolve(process.cwd(), configPath);
  try {
    const mod = await import(resolvedPath);
    const f = mod.framework || mod.f;
    if (!f) {
      console.error(`Error: No 'framework' export found in ${resolvedPath}`);
      process.exit(1);
    }
    return f;
  } catch (err) {
    console.error(`Error: Failed to load config from ${resolvedPath}`);
    console.error(err);
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
    "Tenant ID (isolated-db mode) — launches Studio against that tenant's database",
  )
  .action(
    async (options: {
      config: string;
      host: string;
      port: string;
      tenant?: string;
    }) => {
      const f = await loadFramework(options.config);

      if (options.tenant && f.db.tenantResolver) {
        const tenantConfig = await f.db.tenantResolver.resolve(options.tenant);
        await startStudioPostgresServer(f.db.getSchemas(), tenantConfig);
        return;
      }

      if (!f.db.config) {
        console.error(
          "Error: Could not get database configuration from framework",
        );
        process.exit(1);
      }

      await startStudioPostgresServer(f.db.getSchemas(), f.db.config);
    },
  );

program
  .command("tenants")
  .description("List all tenants (isolated-db mode)")
  .requiredOption("-c, --config <path>", "Path to the Aspen config file")
  .action(async (options: { config: string }) => {
    const f = await loadFramework(options.config);

    if (!f.db.tenantResolver) {
      console.error(
        "Error: Tenants command is only available in isolated-db mode",
      );
      process.exit(1);
    }

    const tenantIds = await f.db.tenantResolver.list();
    console.log(`Found ${tenantIds.length} tenant(s):`);
    for (const id of tenantIds) {
      console.log(`  - ${id}`);
    }
  });

program.parse();

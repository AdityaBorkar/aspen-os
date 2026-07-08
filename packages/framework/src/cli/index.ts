#!/usr/bin/env bun

import { resolve } from "node:path";

import { Command } from "commander";
import { startStudioPostgresServer } from "drizzle-kit/api";

import type { DatabaseUnit } from "@/server/db";
import type { Framework } from "../server/index";

const program = new Command();

program.name("aspen").description("Aspen OS Framework CLI").version("0.1.0");

program
  .command("db-studio")
  .description("Launch Drizzle Kit Studio for database management")
  .requiredOption("-c, --config <path>", "Path to the Aspen config file")
  .option("-p, --port <port>", "Port for Drizzle Studio", "4983")
  .option("-h, --host <host>", "Host for Drizzle Studio", "0.0.0.0")
  .action(async (options: { config: string; port: string; host: string }) => {
    const configPath = resolve(process.cwd(), options.config);

    let framework: Framework;
    try {
      const mod = await import(configPath);
      framework = mod.framework;
      if (!framework) {
        console.error(`Error: No 'framework' export found in ${configPath}`);
        process.exit(1);
      }
    } catch (err) {
      console.error(`Error: Failed to load config from ${configPath}`);
      console.error(err);
      process.exit(1);
    }

    const dbUnit = framework.getUnit("db") as DatabaseUnit | undefined;
    if (!dbUnit?.config) {
      console.error(
        "Error: Could not get database configuration from framework",
      );
      process.exit(1);
    }

    await startStudioPostgresServer(dbUnit.getSchemas(), dbUnit.config);
  });

program.parse();

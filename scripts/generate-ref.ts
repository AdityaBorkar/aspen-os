#!/usr/bin/env bun

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

import fg from "fast-glob";

const ROOT = resolve(import.meta.dir, "..");
const OUTPUT_PATH = join(ROOT, "docs/.generated/ref.json");
const CHECK_FLAG = process.argv.includes("--check");

interface ModuleEntry {
  consumes: string[];
  dependencies: string[];
  file: string;
  name: string;
  package: string;
}

interface SchemaEntry {
  file: string;
  name: string;
  package: string;
}

interface DbSchemaEntry {
  file: string;
  kind: "enum" | "table";
  name: string;
  package: string;
  tableName: string;
}

interface WorkflowEntry {
  exportName: string | null;
  file: string;
  name: string;
  package: string;
}

interface WorkflowStepEntry {
  exportName: string | null;
  file: string;
  name: string;
  package: string;
}

interface EventEntry {
  constant: string;
  file: string;
  group: string;
  package: string;
  topic: string;
}

interface RefData {
  dbSchemas: DbSchemaEntry[];
  events: EventEntry[];
  generatedAt: string;
  modules: ModuleEntry[];
  schemas: SchemaEntry[];
  workflowSteps: WorkflowStepEntry[];
  workflows: WorkflowEntry[];
}

function toPosix(path: string): string {
  return path.split("/").join("/").replaceAll("\\", "/");
}

function extractQuotedStrings(input: string): string[] {
  const matches = [...input.matchAll(/["']([^"']+)["']/g)];
  return matches.map((m) => m[1] ?? "").filter(Boolean);
}

async function collectModules(): Promise<ModuleEntry[]> {
  const files = await fg("packages/*/src/module.ts", { absolute: false, cwd: ROOT });
  const entries: ModuleEntry[] = [];
  for (const file of files) {
    const full = join(ROOT, file);
    const content = await readFile(full, "utf8");
    const pkgDir = file.split("/").slice(0, 2).join("/");
    const pkgJsonPath = join(ROOT, pkgDir, "package.json");
    let pkgName = pkgDir;
    try {
      // SAFETY: package.json is JSON with optional name field; cast narrows to expected shape after parse.
      const pkgJson = JSON.parse(await readFile(pkgJsonPath, "utf8")) as { name?: string };
      if (pkgJson.name) {
        pkgName = pkgJson.name;
      }
    } catch {
      // ignore
    }
    const nameMatch = /readonly\s+\$name\s*=\s*["']([^"']+)["']/.exec(content);
    const name = nameMatch?.[1] ?? pkgName;
    const depsMatch = /readonly\s+\$dependencies\s*=\s*\[([^\]]*)\]/s.exec(content);
    const dependencies = depsMatch ? extractQuotedStrings(depsMatch[1] ?? "") : [];
    const consumesMatch = /readonly\s+\$consumes\s*=\s*\[([^\]]*)\]/s.exec(content);
    const consumes = consumesMatch ? extractQuotedStrings(consumesMatch[1] ?? "") : [];
    // also handle $consumes defined as static? fallback to search for $consumes anywhere
    let extraConsumes: string[] = [];
    if (!consumesMatch) {
      const alt = /\$consumes[^[]*\[([^\]]*)\]/s.exec(content);
      if (alt) {
        extraConsumes = extractQuotedStrings(alt[1] ?? "");
      }
    }
    entries.push({
      consumes: consumes.length > 0 ? consumes : extraConsumes,
      dependencies,
      file: toPosix(file),
      name,
      package: pkgName,
    });
  }
  // also include packages without module.ts as stub entries (no special processing)
  const pkgFiles = await fg("packages/*/package.json", { absolute: false, cwd: ROOT });
  for (const pkgFile of pkgFiles) {
    const pkgDir = pkgFile.split("/").slice(0, 2).join("/");
    const moduleFile = `${pkgDir}/src/module.ts`;
    if (files.includes(moduleFile)) {
      continue;
    }
    const full = join(ROOT, pkgFile);
    // SAFETY: package.json shape is unknown after JSON.parse; name is optional string we read if present.
    const pkgJson = JSON.parse(await readFile(full, "utf8")) as { name?: string };
    const pkgName = pkgJson.name ?? pkgDir;
    entries.push({
      consumes: [],
      dependencies: [],
      file: toPosix(`${pkgDir}/src/index.ts`),
      name: pkgName.replace(/^@aspen-os\//, ""),
      package: pkgName,
    });
  }
  entries.sort((a, b) => a.package.localeCompare(b.package));
  return entries;
}

async function collectSchemas(): Promise<SchemaEntry[]> {
  const files = await fg("packages/*/src/schemas/**/*.ts", { absolute: false, cwd: ROOT });
  const entries: SchemaEntry[] = [];
  for (const file of files) {
    const content = await readFile(join(ROOT, file), "utf8");
    const pkgName = await getPackageName(file);
    // export const FooSchema
    for (const m of content.matchAll(/export\s+(?:const\s+)?(\w+Schema)\b/g)) {
      const name = m[1];
      if (!name) {
        continue;
      }
      entries.push({ file: toPosix(file), name, package: pkgName });
    }
    // also capture re-exported schemas via export { FooSchema } — already covered if source file defines, but handle index re-exports that don't define const
    // Parse export { A, B } from "#/schemas/..." — we skip since those are re-exports, definitions already captured
  }
  entries.sort(
    (a, b) =>
      a.package.localeCompare(b.package) ||
      a.name.localeCompare(b.name) ||
      a.file.localeCompare(b.file),
  );
  // deduplicate by package+name+file
  const seen = new Set<string>();
  const dedup: SchemaEntry[] = [];
  for (const e of entries) {
    const key = `${e.package}:${e.name}:${e.file}`;
    if (!seen.has(key)) {
      seen.add(key);
      dedup.push(e);
    }
  }
  return dedup;
}

async function collectDbSchemas(): Promise<DbSchemaEntry[]> {
  const files = await fg("packages/*/src/db-schemas/**/*.ts", { absolute: false, cwd: ROOT });
  const entries: DbSchemaEntry[] = [];
  for (const file of files) {
    const content = await readFile(join(ROOT, file), "utf8");
    const pkgName = await getPackageName(file);
    for (const m of content.matchAll(
      /export\s+const\s+(\w+)\s*=\s*pgTable\(\s*["']([^"']+)["']/g,
    )) {
      const name = m[1];
      const tableName = m[2];
      if (!name || !tableName) {
        continue;
      }
      entries.push({ file: toPosix(file), kind: "table", name, package: pkgName, tableName });
    }
    for (const m of content.matchAll(/export\s+const\s+(\w+)\s*=\s*pgEnum\(\s*["']([^"']+)["']/g)) {
      const name = m[1];
      const tableName = m[2];
      if (!name || !tableName) {
        continue;
      }
      entries.push({ file: toPosix(file), kind: "enum", name, package: pkgName, tableName });
    }
  }
  entries.sort(
    (a, b) =>
      a.package.localeCompare(b.package) ||
      a.tableName.localeCompare(b.tableName) ||
      a.name.localeCompare(b.name),
  );
  return entries;
}

async function collectWorkflows(): Promise<WorkflowEntry[]> {
  const files = await fg("packages/*/src/workflows/**/*.ts", { absolute: false, cwd: ROOT });
  const entries: WorkflowEntry[] = [];
  for (const file of files) {
    const content = await readFile(join(ROOT, file), "utf8");
    const pkgName = await getPackageName(file);
    const workflowNames = [...content.matchAll(/Workflow\.name\(\s*["']([^"']+)["']\s*\)/g)].map(
      (m) => m[1] ?? "",
    );
    if (workflowNames.length === 0) {
      continue;
    }
    // capture export name
    const exportMatch = /export\s+const\s+(\w+)\s*=\s*Workflow\.name/.exec(content);
    const exportName = exportMatch?.[1] ?? null;
    for (const name of workflowNames) {
      if (!name) {
        continue;
      }
      entries.push({ exportName, file: toPosix(file), name, package: pkgName });
    }
  }
  entries.sort((a, b) => a.name.localeCompare(b.name) || a.package.localeCompare(b.package));
  return entries;
}

async function collectWorkflowSteps(): Promise<WorkflowStepEntry[]> {
  const files = await fg("packages/*/src/workflow-steps/**/*.ts", { absolute: false, cwd: ROOT });
  const entries: WorkflowStepEntry[] = [];
  for (const file of files) {
    const content = await readFile(join(ROOT, file), "utf8");
    const pkgName = await getPackageName(file);
    const stepNames = [...content.matchAll(/WorkflowStep\.name\(\s*["']([^"']+)["']\s*\)/g)].map(
      (m) => m[1] ?? "",
    );
    if (stepNames.length === 0) {
      continue;
    }
    const exportMatch = /export\s+const\s+(\w+)\s*=\s*WorkflowStep\.name/.exec(content);
    const exportName = exportMatch?.[1] ?? null;
    // Also handle dynamic helper: return WorkflowStep.name(stepName) — skip those generic ones without literal
    for (const name of stepNames) {
      if (!name) {
        continue;
      }
      // Skip generic stepName variable references that are not literals? Our regex only captures quoted literals, so it's fine
      entries.push({ exportName, file: toPosix(file), name, package: pkgName });
    }
  }
  // Some workflow steps use variable stepName param — they will be caught as literal? Already filtered.
  // Also check for steps defined via WorkflowStep.name("...").handler in workflows? but those are workflows not steps — we only scan workflow-steps dir
  entries.sort((a, b) => a.name.localeCompare(b.name) || a.package.localeCompare(b.package));
  // deduplicate by name+package+file (some files define multiple steps via helper)
  const seen = new Set<string>();
  const dedup: WorkflowStepEntry[] = [];
  for (const e of entries) {
    const key = `${e.package}:${e.name}:${e.file}`;
    if (!seen.has(key)) {
      seen.add(key);
      dedup.push(e);
    }
  }
  return dedup;
}

async function collectEvents(): Promise<EventEntry[]> {
  const files = await fg("packages/*/src/pubsub.ts", { absolute: false, cwd: ROOT });
  const entries: EventEntry[] = [];
  for (const file of files) {
    const content = await readFile(join(ROOT, file), "utf8");
    const pkgName = await getPackageName(file);
    // Find const blocks like export const TASK_EVENTS = { ... } as const
    const blocks = [
      ...content.matchAll(/export\s+const\s+(\w+)\s*=\s*\{([\s\S]*?)\}\s*as\s+const/g),
    ];
    for (const block of blocks) {
      const group = block[1] ?? "";
      const body = block[2] ?? "";
      if (!group.endsWith("_EVENTS")) {
        continue;
      }
      for (const m of body.matchAll(/(\w+)\s*:\s*["']([^"']+)["']/g)) {
        const constant = m[1] ?? "";
        const topic = m[2] ?? "";
        if (!topic.includes(":")) {
          continue;
        }
        entries.push({
          constant: `${group}.${constant}`,
          file: toPosix(file),
          group,
          package: pkgName,
          topic,
        });
      }
    }
    // Fallback: generic topic strings "domain:event" in file even if not in EVENTS const
    // We already captured the canonical ones; no need for fallback.
  }
  entries.sort((a, b) => a.topic.localeCompare(b.topic) || a.package.localeCompare(b.package));
  return entries;
}

async function getPackageName(file: string): Promise<string> {
  const pkgDir = file.split("/").slice(0, 2).join("/");
  try {
    // SAFETY: package.json is external JSON; we only read optional name field, cast is safe after parse.
    const pkgJson = JSON.parse(await readFile(join(ROOT, pkgDir, "package.json"), "utf8")) as {
      name?: string;
    };
    return pkgJson.name ?? pkgDir;
  } catch {
    return pkgDir;
  }
}

async function main() {
  const [modules, schemas, dbSchemas, workflows, workflowSteps, events] = await Promise.all([
    collectModules(),
    collectSchemas(),
    collectDbSchemas(),
    collectWorkflows(),
    collectWorkflowSteps(),
    collectEvents(),
  ]);

  const data: RefData = {
    dbSchemas,
    events,
    generatedAt: new Date().toISOString(),
    modules,
    schemas,
    workflowSteps,
    workflows,
  };

  const json = `${JSON.stringify(data, null, 2)}\n`;

  if (CHECK_FLAG) {
    let existing = "";
    try {
      existing = await readFile(OUTPUT_PATH, "utf8");
    } catch {
      console.error(`Missing ${relative(ROOT, OUTPUT_PATH)} — run bun run gen:ref`);
      process.exit(1);
    }
    // Compare without generatedAt for stability
    // SAFETY: JSON.parse of ref.json produces RefData shape; validated by generator output.
    const parseExisting = JSON.parse(existing) as RefData;
    const normalizedExisting = { ...parseExisting, generatedAt: "" };
    const normalizedNext = { ...data, generatedAt: "" };
    if (JSON.stringify(normalizedExisting) !== JSON.stringify(normalizedNext)) {
      console.error(`Out of date ${relative(ROOT, OUTPUT_PATH)} — run bun run gen:ref`);
      process.exit(1);
    }
    console.log("ref.json is up to date");
    return;
  }

  await mkdir(join(ROOT, "docs/.generated"), { recursive: true });
  await writeFile(OUTPUT_PATH, json);
  // Also write to src/lib/generated for bundler-friendly import (Cloudflare Workers have no fs)
  const srcGenerated = join(ROOT, "docs/src/lib/generated/ref.json");
  await mkdir(join(ROOT, "docs/src/lib/generated"), { recursive: true });
  await writeFile(srcGenerated, json);
  console.log(`Generated ${relative(ROOT, OUTPUT_PATH)}`);
  console.log(
    `  modules=${modules.length} schemas=${schemas.length} dbSchemas=${dbSchemas.length} workflows=${workflows.length} steps=${workflowSteps.length} events=${events.length}`,
  );
}

await main();

#!/usr/bin/env bun
// @oxlint-ignore

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

import fg from "fast-glob";

const ROOT = resolve(import.meta.dir, "..");
const OUTPUT_PATH = join(ROOT, "docs/.generated/ref.json");
const SRC_OUTPUT_PATH = join(ROOT, "docs/src/lib/generated/ref.json");
const CHECK_FLAG = process.argv.includes("--check");

interface FileEntry {
  file: string;
  package: string;
}

interface ModuleEntry extends FileEntry {
  consumes: string[];
  dependencies: string[];
  name: string;
}

interface SchemaEntry extends FileEntry {
  name: string;
}

interface DbSchemaEntry extends FileEntry {
  kind: "enum" | "table";
  name: string;
  tableName: string;
}

interface WorkflowEntry extends FileEntry {
  exportName: string | null;
  name: string;
}

interface WorkflowStepEntry extends FileEntry {
  exportName: string | null;
  name: string;
}

interface EventEntry extends FileEntry {
  constant: string;
  group: string;
  topic: string;
}

interface RefData {
  dbSchemas: DbSchemaEntry[];
  events: EventEntry[];
  modules: ModuleEntry[];
  schemas: SchemaEntry[];
  workflowSteps: WorkflowStepEntry[];
  workflows: WorkflowEntry[];
}

interface FileContext {
  file: string;
  packageName: string;
}

function toPosix(path: string): string {
  return path.replaceAll("\\", "/");
}

function packageDirOf(file: string): string {
  return file.split("/").slice(0, 2).join("/");
}

function extractQuotedStrings(input: string): string[] {
  const out: string[] = [];
  for (const match of input.matchAll(/["']([^"']+)["']/g)) {
    const value = match[1];
    if (value) {
      out.push(value);
    }
  }
  return out;
}

function readPackageName(pkgDir: string, content: string): string {
  // SAFETY: package.json is external JSON; we only read its optional name field.
  const parsed = JSON.parse(content) as { name?: string };
  return parsed.name ? parsed.name : pkgDir;
}

async function getPackageName(pkgDir: string): Promise<string> {
  try {
    return readPackageName(pkgDir, await readFile(join(ROOT, pkgDir, "package.json"), "utf8"));
  } catch {
    return pkgDir;
  }
}

function dedupeBy<T>(entries: T[], keyOf: (entry: T) => string): T[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = keyOf(entry);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function collect<T>(
  pattern: string,
  parse: (content: string, ctx: FileContext) => T[],
  compare: (a: T, b: T) => number,
  keyOf?: (entry: T) => string,
): Promise<T[]> {
  const files = await fg(pattern, { absolute: false, cwd: ROOT });
  const entries: T[] = [];
  for (const file of files) {
    const content = await readFile(join(ROOT, file), "utf8");
    const ctx: FileContext = {
      file: toPosix(file),
      packageName: await getPackageName(packageDirOf(file)),
    };
    entries.push(...parse(content, ctx));
  }
  entries.sort(compare);
  return keyOf ? dedupeBy(entries, keyOf) : entries;
}

function firstCapture(content: string, pattern: RegExp): string | null {
  const match = pattern.exec(content);
  const value = match?.[1];
  return value ?? null;
}

function allCaptures(content: string, pattern: RegExp): string[] {
  const out: string[] = [];
  for (const match of content.matchAll(pattern)) {
    const value = match[1];
    if (value) {
      out.push(value);
    }
  }
  return out;
}

function parseModule(content: string, ctx: FileContext): ModuleEntry[] {
  const name = firstCapture(content, /readonly\s+\$name\s*=\s*["']([^"']+)["']/) ?? ctx.packageName;
  const dependencies = extractQuotedStrings(
    firstCapture(content, /readonly\s+\$dependencies\s*=\s*\[([^\]]*)\]/s) ?? "",
  );
  const consumes = extractQuotedStrings(
    firstCapture(content, /\$consumes\s*=\s*\[([^\]]*)\]/s) ?? "",
  );
  return [{ consumes, dependencies, file: ctx.file, name, package: ctx.packageName }];
}

function parseSchemas(content: string, ctx: FileContext): SchemaEntry[] {
  return allCaptures(content, /export\s+(?:const\s+)?(\w+Schema)\b/g).map((name) => ({
    file: ctx.file,
    name,
    package: ctx.packageName,
  }));
}

const DB_DECLARATIONS = [
  { kind: "table", pattern: /export\s+const\s+(\w+)\s*=\s*pgTable\(\s*["']([^"']+)["']/g },
  { kind: "enum", pattern: /export\s+const\s+(\w+)\s*=\s*pgEnum\(\s*["']([^"']+)["']/g },
] as const;

function parseDbSchemas(content: string, ctx: FileContext): DbSchemaEntry[] {
  const entries: DbSchemaEntry[] = [];
  for (const { kind, pattern } of DB_DECLARATIONS) {
    for (const match of content.matchAll(pattern)) {
      const name = match[1];
      const tableName = match[2];
      if (name && tableName) {
        entries.push({ file: ctx.file, kind, name, package: ctx.packageName, tableName });
      }
    }
  }
  return entries;
}

interface NamedCalls {
  exportName: string | null;
  names: string[];
}

function parseNamedCalls(fnLabel: string, content: string): NamedCalls {
  const names = allCaptures(
    content,
    new RegExp(`${fnLabel}\\.name\\(\\s*["']([^"']+)["']\\s*\\)`, "g"),
  );
  if (names.length === 0) {
    return { exportName: null, names: [] };
  }
  const exportName = firstCapture(
    content,
    new RegExp(`export\\s+const\\s+(\\w+)\\s*=\\s*${fnLabel}\\.name`),
  );
  return { exportName, names };
}

function parseWorkflows(content: string, ctx: FileContext): WorkflowEntry[] {
  const { exportName, names } = parseNamedCalls("Workflow", content);
  return names.map((name) => ({ exportName, file: ctx.file, name, package: ctx.packageName }));
}

function parseWorkflowSteps(content: string, ctx: FileContext): WorkflowStepEntry[] {
  const { exportName, names } = parseNamedCalls("WorkflowStep", content);
  return names.map((name) => ({ exportName, file: ctx.file, name, package: ctx.packageName }));
}

function parseEvents(content: string, ctx: FileContext): EventEntry[] {
  const entries: EventEntry[] = [];
  for (const block of content.matchAll(
    /export\s+const\s+(\w+)\s*=\s*\{([\s\S]*?)\}\s*as\s+const/g,
  )) {
    const group = block[1];
    const body = block[2];
    if (!group || !group.endsWith("_EVENTS") || !body) {
      continue;
    }
    for (const match of body.matchAll(/(\w+)\s*:\s*["']([^"']+)["']/g)) {
      const constant = match[1];
      const topic = match[2];
      if (constant && topic?.includes(":")) {
        entries.push({
          constant: `${group}.${constant}`,
          file: ctx.file,
          group,
          package: ctx.packageName,
          topic,
        });
      }
    }
  }
  return entries;
}

async function collectModules(): Promise<ModuleEntry[]> {
  const entries = await collect("packages/*/src/module.ts", parseModule, (a, b) =>
    a.package.localeCompare(b.package),
  );
  const known = new Set(entries.map((entry) => packageDirOf(entry.file)));
  const pkgFiles = await fg("packages/*/package.json", { absolute: false, cwd: ROOT });
  for (const pkgFile of pkgFiles) {
    const pkgDir = packageDirOf(pkgFile);
    if (known.has(pkgDir)) {
      continue;
    }
    const pkgName = await getPackageName(pkgDir);
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

function collectSchemas(): Promise<SchemaEntry[]> {
  return collect(
    "packages/*/src/schemas/**/*.ts",
    parseSchemas,
    (a, b) =>
      a.package.localeCompare(b.package) ||
      a.name.localeCompare(b.name) ||
      a.file.localeCompare(b.file),
    (entry) => `${entry.package}:${entry.name}:${entry.file}`,
  );
}

function collectDbSchemas(): Promise<DbSchemaEntry[]> {
  return collect(
    "packages/*/src/db-schemas/**/*.ts",
    parseDbSchemas,
    (a, b) =>
      a.package.localeCompare(b.package) ||
      a.tableName.localeCompare(b.tableName) ||
      a.name.localeCompare(b.name),
  );
}

function collectWorkflows(): Promise<WorkflowEntry[]> {
  return collect(
    "packages/*/src/workflows/**/*.ts",
    parseWorkflows,
    (a, b) => a.name.localeCompare(b.name) || a.package.localeCompare(b.package),
  );
}

function collectWorkflowSteps(): Promise<WorkflowStepEntry[]> {
  return collect(
    "packages/*/src/workflow-steps/**/*.ts",
    parseWorkflowSteps,
    (a, b) => a.name.localeCompare(b.name) || a.package.localeCompare(b.package),
    (entry) => `${entry.package}:${entry.name}:${entry.file}`,
  );
}

function collectEvents(): Promise<EventEntry[]> {
  return collect(
    "packages/*/src/pubsub.ts",
    parseEvents,
    (a, b) => a.topic.localeCompare(b.topic) || a.package.localeCompare(b.package),
  );
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

  const data: RefData = { dbSchemas, events, modules, schemas, workflowSteps, workflows };
  const json = `${JSON.stringify(data, null, 2)}\n`;

  if (CHECK_FLAG) {
    let existing = "";
    try {
      existing = await readFile(OUTPUT_PATH, "utf8");
    } catch {
      console.error(`Missing ${relative(ROOT, OUTPUT_PATH)} — run bun run gen:ref`);
      process.exit(1);
    }
    if (existing !== json) {
      console.error(`Out of date ${relative(ROOT, OUTPUT_PATH)} — run bun run gen:ref`);
      process.exit(1);
    }
    console.log("ref.json is up to date");
    return;
  }

  await Promise.all([
    mkdir(join(ROOT, "docs/.generated"), { recursive: true }),
    mkdir(join(ROOT, "docs/src/lib/generated"), { recursive: true }),
  ]);
  await Promise.all([writeFile(OUTPUT_PATH, json), writeFile(SRC_OUTPUT_PATH, json)]);
  console.log(`Generated ${relative(ROOT, OUTPUT_PATH)}`);
  console.log(
    `  modules=${modules.length} schemas=${schemas.length} dbSchemas=${dbSchemas.length} workflows=${workflows.length} steps=${workflowSteps.length} events=${events.length}`,
  );
}

await main();

#!/usr/bin/env bun

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
  for (const match of input.matchAll(/["'](?<quoted>[^"']+)["']/g)) {
    const quoted = match.groups?.quoted;
    if (quoted) {
      out.push(quoted);
    }
  }
  return out;
}

function readPackageName(pkgDir: string, content: string): string {
  // SAFETY: package.json is external JSON; we only read its optional name field.
  const parsed = JSON.parse(content) as { name?: string };
  return parsed.name || pkgDir;
}

async function getPackageName(pkgDir: string): Promise<string> {
  try {
    return readPackageName(pkgDir, await readFile(join(ROOT, pkgDir, "package.json"), "utf8"));
  } catch {
    return pkgDir;
  }
}

function dedupeBy<TEntry>(entries: TEntry[], keyOf: (entry: TEntry) => string): TEntry[] {
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

interface CollectOptions<TEntry> {
  compare: (left: TEntry, right: TEntry) => number;
  keyOf?: (entry: TEntry) => string;
  parse: (content: string, ctx: FileContext) => TEntry[];
  pattern: string;
}

async function collect<TEntry>(options: CollectOptions<TEntry>): Promise<TEntry[]> {
  const { compare, keyOf, parse, pattern } = options;
  const files = await fg(pattern, { absolute: false, cwd: ROOT });
  const parsedGroups = await Promise.all(
    files.map(async (file) => {
      const content = await readFile(join(ROOT, file), "utf8");
      const packageName = await getPackageName(packageDirOf(file));
      const ctx: FileContext = {
        file: toPosix(file),
        packageName,
      };
      return parse(content, ctx);
    }),
  );
  const entries: TEntry[] = parsedGroups.flat();
  entries.sort(compare);
  return keyOf ? dedupeBy(entries, keyOf) : entries;
}

function firstNamedCapture(content: string, pattern: RegExp, groupName: string): string | null {
  const match = pattern.exec(content);
  const captured = match?.groups?.[groupName];
  return captured ?? null;
}

function allNamedCaptures(content: string, pattern: RegExp, groupName: string): string[] {
  const out: string[] = [];
  for (const match of content.matchAll(pattern)) {
    const captured = match.groups?.[groupName];
    if (captured) {
      out.push(captured);
    }
  }
  return out;
}

function parseModule(content: string, ctx: FileContext): ModuleEntry[] {
  const name =
    firstNamedCapture(
      content,
      /readonly\s+\$name\s*=\s*["'](?<moduleName>[^"']+)["']/,
      "moduleName",
    ) ?? ctx.packageName;
  const dependencies = extractQuotedStrings(
    firstNamedCapture(
      content,
      /readonly\s+\$dependencies\s*=\s*\[(?<dependencies>[^\]]*)\]/s,
      "dependencies",
    ) ?? "",
  );
  const consumes = extractQuotedStrings(
    firstNamedCapture(content, /\$consumes\s*=\s*\[(?<consumes>[^\]]*)\]/s, "consumes") ?? "",
  );
  return [{ consumes, dependencies, file: ctx.file, name, package: ctx.packageName }];
}

function parseSchemas(content: string, ctx: FileContext): SchemaEntry[] {
  return allNamedCaptures(
    content,
    /export\s+(?:const\s+)?(?<schemaName>\w+Schema)\b/g,
    "schemaName",
  ).map((name) => ({
    file: ctx.file,
    name,
    package: ctx.packageName,
  }));
}

const DB_DECLARATIONS = [
  {
    kind: "table",
    pattern:
      /export\s+const\s+(?<declarationName>\w+)\s*=\s*pgTable\(\s*["'](?<tableName>[^"']+)["']/g,
  },
  {
    kind: "enum",
    pattern:
      /export\s+const\s+(?<declarationName>\w+)\s*=\s*pgEnum\(\s*["'](?<tableName>[^"']+)["']/g,
  },
] as const;

function parseDbSchemas(content: string, ctx: FileContext): DbSchemaEntry[] {
  const entries: DbSchemaEntry[] = [];
  for (const { kind, pattern } of DB_DECLARATIONS) {
    for (const match of content.matchAll(pattern)) {
      const declarationName = match.groups?.declarationName;
      const tableName = match.groups?.tableName;
      if (declarationName && tableName) {
        entries.push({
          file: ctx.file,
          kind,
          name: declarationName,
          package: ctx.packageName,
          tableName,
        });
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
  const names = allNamedCaptures(
    content,
    new RegExp(`${fnLabel}\\.name\\(\\s*["'](?<calledName>[^"']+)["']\\s*\\)`, "g"),
    "calledName",
  );
  if (names.length === 0) {
    return { exportName: null, names: [] };
  }
  const exportName = firstNamedCapture(
    content,
    new RegExp(`export\\s+const\\s+(?<exportedName>\\w+)\\s*=\\s*${fnLabel}\\.name`),
    "exportedName",
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
    /export\s+const\s+(?<group>\w+)\s*=\s*\{(?<body>[\s\S]*?)\}\s*as\s+const/g,
  )) {
    const group = block.groups?.group;
    const body = block.groups?.body;
    if (!group || !group.endsWith("_EVENTS") || !body) {
      continue;
    }
    for (const match of body.matchAll(/(?<constant>\w+)\s*:\s*["'](?<topic>[^"']+)["']/g)) {
      const constant = match.groups?.constant;
      const topic = match.groups?.topic;
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
  const entries = await collect({
    compare: (left, right) => left.package.localeCompare(right.package),
    parse: parseModule,
    pattern: "packages/*/src/module.ts",
  });
  const known = new Set(entries.map((entry) => packageDirOf(entry.file)));
  const pkgFiles = await fg("packages/*/package.json", { absolute: false, cwd: ROOT });
  const missingDirs = [...new Set(pkgFiles.map((pkgFile) => packageDirOf(pkgFile)))].filter(
    (pkgDir) => !known.has(pkgDir),
  );
  const missingEntries = await Promise.all(
    missingDirs.map(async (pkgDir): Promise<ModuleEntry> => {
      const pkgName = await getPackageName(pkgDir);
      return {
        consumes: [],
        dependencies: [],
        file: toPosix(`${pkgDir}/src/index.ts`),
        name: pkgName.replace(/^@aspen-os\//, ""),
        package: pkgName,
      };
    }),
  );
  entries.push(...missingEntries);
  entries.sort((left, right) => left.package.localeCompare(right.package));
  return entries;
}

function collectSchemas(): Promise<SchemaEntry[]> {
  return collect({
    compare: (left, right) =>
      left.package.localeCompare(right.package) ||
      left.name.localeCompare(right.name) ||
      left.file.localeCompare(right.file),
    keyOf: (entry) => `${entry.package}:${entry.name}:${entry.file}`,
    parse: parseSchemas,
    pattern: "packages/*/src/schemas/**/*.ts",
  });
}

function collectDbSchemas(): Promise<DbSchemaEntry[]> {
  return collect({
    compare: (left, right) =>
      left.package.localeCompare(right.package) ||
      left.tableName.localeCompare(right.tableName) ||
      left.name.localeCompare(right.name),
    parse: parseDbSchemas,
    pattern: "packages/*/src/db-schemas/**/*.ts",
  });
}

function collectWorkflows(): Promise<WorkflowEntry[]> {
  return collect({
    compare: (left, right) =>
      left.name.localeCompare(right.name) || left.package.localeCompare(right.package),
    parse: parseWorkflows,
    pattern: "packages/*/src/workflows/**/*.ts",
  });
}

function collectWorkflowSteps(): Promise<WorkflowStepEntry[]> {
  return collect({
    compare: (left, right) =>
      left.name.localeCompare(right.name) || left.package.localeCompare(right.package),
    keyOf: (entry) => `${entry.package}:${entry.name}:${entry.file}`,
    parse: parseWorkflowSteps,
    pattern: "packages/*/src/workflow-steps/**/*.ts",
  });
}

function collectEvents(): Promise<EventEntry[]> {
  return collect({
    compare: (left, right) =>
      left.topic.localeCompare(right.topic) || left.package.localeCompare(right.package),
    parse: parseEvents,
    pattern: "packages/*/src/pubsub.ts",
  });
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

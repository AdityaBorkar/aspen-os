#!/usr/bin/env bun

import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

import { $, build, file } from "bun";
import deepmerge from "deepmerge";

const $dev = process.argv.includes("--dev");
const OUTPUT_DIRNAME = ".output";

const DB_ADAPTERS = [
  "@aws-sdk/client-rds-data",
  "@electric-sql/pglite",
  "@libsql/client",
  "@libsql/client-wasm",
  "@libsql/client/http",
  "@libsql/client/node",
  "@libsql/client/sqlite3",
  "@libsql/client/web",
  "@libsql/client/ws",
  "@neondatabase/serverless",
  "@planetscale/database",
  "@prisma/client",
  "@tidbcloud/serverless",
  "@upstash/redis",
  "@vercel/postgres",
  "better-sqlite3",
  "expo-sqlite",
  "gel",
  "mysql2",
  "mysql2/promise",
];

const ROOT = resolve(process.cwd());
const TSCONFIG_BUILD = {
  compilerOptions: {
    composite: false,
    declaration: true,
    declarationDir: OUTPUT_DIRNAME,
    declarationMap: false,
    emitDeclarationOnly: true,
    incremental: false,
    outDir: OUTPUT_DIRNAME,
    rootDir: "src",
  },
  exclude: ["node_modules", OUTPUT_DIRNAME],
  extends: "./tsconfig.json",
  include: ["src/**/*.ts", "src/**/*.tsx"],
};

interface Entry {
  bin: boolean;
  name: string;
  outdir: string;
  src: string;
  target: "node" | "browser" | "bun";
}

interface BuildConfig {
  bin?: Record<string, string>;
  exports?: Record<string, { path: string; target: Entry["target"] }>;
  files?: string[];
}

interface RevisedPkg {
  bin?: Record<string, string>;
  exports?: Record<string, { default: string; types: string } | string>;
  files?: string[];
}

const relToSrc = (srcPath: string) => srcPath.replace(/^\.\/src\//, "");
const subdirFor = (srcPath: string) => dirname(relToSrc(srcPath));

async function rewriteAliasImports(outputDir: string): Promise<void> {
  const declarationFiles: string[] = [];

  async function collect(dir: string): Promise<void> {
    const directories: string[] = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        directories.push(full);
      } else if (entry.name.endsWith(".d.ts")) {
        declarationFiles.push(full);
      }
    }
    await Promise.all(directories.map((directory) => collect(directory)));
  }

  await collect(outputDir);

  await Promise.all(
    declarationFiles.map(async (declarationFile) => {
      const prefix = relative(dirname(declarationFile), outputDir).replaceAll("\\", "/") || ".";
      const source = await readFile(declarationFile, "utf8");
      if (!source.includes('"#/')) {
        return;
      }
      const rewritten = source.replaceAll('"#/', `"${prefix}/`);
      await writeFile(declarationFile, rewritten);
    }),
  );
}

async function parsePackageJson() {
  const outputDirname = $dev ? "src" : OUTPUT_DIRNAME;
  const OUTPUT_DIR = join(ROOT, outputDirname);
  const outputFile = (srcPath: string, ext: ".js" | ".d.ts") =>
    `./${outputDirname}/${relToSrc(srcPath).replace(/(?:\.d\.ts|\.[^.]+)$/, ext)}`;

  const pkg = JSON.parse(await file(join(ROOT, "package.json")).text()) as Record<string, unknown>;

  const buildConfig = (pkg.build ?? {}) as BuildConfig;
  const binConfig = buildConfig.bin ?? {};
  const exportsConfig = buildConfig.exports ?? {};
  const filesConfig = buildConfig.files ?? [];

  const entries: Entry[] = [];
  const revisedPkg: RevisedPkg = {};

  if (Object.keys(binConfig).length > 0) {
    const binMap = Object.entries(binConfig);
    revisedPkg.bin = Object.fromEntries(
      binMap.map(([key, srcPath]) => [key, $dev ? srcPath : outputFile(srcPath, ".js")]),
    );
    for (const [name, srcPath] of binMap) {
      const outdir = join(OUTPUT_DIR, subdirFor(srcPath));
      const src = join(ROOT, srcPath);
      entries.push({ bin: true, name, outdir, src, target: "bun" });
    }
  }

  if (Object.keys(exportsConfig).length > 0) {
    const exportsMap = Object.entries(exportsConfig);
    revisedPkg.exports = Object.fromEntries(
      exportsMap.map(([key, { path }]) => [
        key,
        $dev
          ? path
          : {
              default: outputFile(path, ".js"),
              types: outputFile(path, ".d.ts"),
            },
      ]),
    );
    for (const [name, { path: srcPath, target }] of exportsMap) {
      const outdir = join(OUTPUT_DIR, subdirFor(srcPath));
      const src = join(ROOT, srcPath);
      entries.push({ bin: false, name, outdir, src, target });
    }
  }

  revisedPkg.files = [...filesConfig, `./${outputDirname}`];

  return { entries, pkg, revisedPkg };
}

async function main() {
  const { pkg, entries, revisedPkg } = await parsePackageJson();

  await rm(join(ROOT, OUTPUT_DIRNAME), { force: true, recursive: true });
  await mkdir(join(ROOT, OUTPUT_DIRNAME), { recursive: true });

  const packageJson = deepmerge(pkg, revisedPkg, { arrayMerge: (_destination, source) => source });
  await file(join(ROOT, "package.json")).write(`${JSON.stringify(packageJson, null, 2)}\n`);

  if ($dev) {
    return;
  }

  // oxlint-disable eslint/no-await-in-loop
  for (const { name, src, outdir, target } of entries) {
    const result = await build({
      entrypoints: [src],
      external: DB_ADAPTERS,
      format: "esm",
      minify: false, // True,
      outdir,
      sourcemap: "inline", // "none",
      target,
    });
    if (!result.success) {
      for (const log of result.logs) {
        console.error(log);
      }
      throw new Error(`Build failed for ${name}`);
    }
  }
  // oxlint-enable eslint/no-await-in-loop

  const tsconfigPath = join(ROOT, "tsconfig.build.json");
  try {
    await file(tsconfigPath).write(`${JSON.stringify(TSCONFIG_BUILD, null, 2)}\n`);
    await $`bun tsc -p ${tsconfigPath}`.cwd(ROOT);
  } finally {
    await rm(tsconfigPath, { force: true });
  }

  await rewriteAliasImports(join(ROOT, OUTPUT_DIRNAME));
}

await main();

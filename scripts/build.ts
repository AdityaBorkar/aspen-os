#!/usr/bin/env bun

import { mkdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { $, build, file } from "bun";

import deepmerge from "deepmerge";

const $dev = true;
const OUTPUT_DIRNAME = ".output";

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

const relToSrc = (p: string) => p.replace(/^\.\/src\//, "");
const subdirFor = (srcPath: string) => dirname(relToSrc(srcPath));

async function parsePackageJson() {
  const outputDirname = $dev ? "src" : OUTPUT_DIRNAME;
  const OUTPUT_DIR = join(ROOT, outputDirname);
  const outputFile = (srcPath: string, ext: ".js" | ".d.ts") =>
    `./${outputDirname}/${relToSrc(srcPath).replace(/(?:\.d\.ts|\.[^.]+)$/, ext)}`;

  const pkg = await file(join(ROOT, "package.json")).json();

  const buildConfig = (pkg.build ?? {}) as BuildConfig;
  const binConfig = buildConfig.bin ?? {};
  const exportsConfig = buildConfig.exports ?? {};
  const filesConfig = buildConfig.files ?? [];

  const entries: Entry[] = [];
  const revisedPkg: RevisedPkg = {};

  if (Object.keys(binConfig).length > 0) {
    const binMap = Object.entries(binConfig);
    revisedPkg.bin = Object.fromEntries(
      binMap.map(([key, srcPath]) => [
        key,
        $dev ? srcPath : outputFile(srcPath, ".js"),
      ]),
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

  revisedPkg.files = [...filesConfig, `./${OUTPUT_DIRNAME}`];

  return { entries, pkg, revisedPkg };
}

async function main() {
  const { pkg, entries, revisedPkg } = await parsePackageJson();

  await rm(join(ROOT, OUTPUT_DIRNAME), { force: true, recursive: true });
  await mkdir(join(ROOT, OUTPUT_DIRNAME), { recursive: true });

  const packageJson = deepmerge(pkg, revisedPkg, { arrayMerge: (_, d) => d });
  await file(join(ROOT, "package.json")).write(
    `${JSON.stringify(packageJson, null, 2)}\n`,
  );

  if ($dev) return;

  for (const { name, src, outdir, target } of entries) {
    const result = await build({
      entrypoints: [src],
      external: ["drizzle-kit"],
      format: "esm",
      minify: true,
      outdir,
      sourcemap: "none",
      target,
    });
    if (!result.success) {
      for (const log of result.logs) console.error(log);
      throw new Error(`Build failed for ${name}`);
    }
  }

  const tsconfigPath = join(ROOT, "tsconfig.build.json");
  try {
    await file(tsconfigPath).write(
      `${JSON.stringify(TSCONFIG_BUILD, null, 2)}\n`,
    );
    await $`bun tsc -p ${tsconfigPath}`.cwd(ROOT);
  } finally {
    await rm(tsconfigPath, { force: true });
  }
}

await main();

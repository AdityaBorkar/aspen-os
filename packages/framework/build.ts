#!/usr/bin/env bun

import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { $, build, file } from "bun";

const ROOT = resolve(process.cwd());
const OUTPUT_DIR = join(ROOT, ".output");
const TSCONFIG_BUILD = {
  compilerOptions: {
    composite: false,
    declaration: true,
    declarationDir: ".output",
    declarationMap: false,
    emitDeclarationOnly: true,
    incremental: false,
    outDir: ".output",
    rootDir: "src",
  },
  exclude: ["node_modules", ".output"],
  extends: "./tsconfig.json",
  include: ["src/**/*.ts", "src/**/*.tsx"],
};

type Target = "node" | "browser" | "bun";
type ExportValue = string | { default: string; types: string };

interface Entry {
  bin: boolean;
  name: string;
  outDir: string;
  src: string;
  target: Target;
}

const relToSrc = (p: string) => p.replace(/^src\//, "");
const subdirFor = (srcPath: string) => dirname(relToSrc(srcPath));
const outputFile = (srcPath: string, ext: ".js" | ".d.ts") =>
  `./.output/${relToSrc(srcPath).replace(/\.tsx?$/, ext)}`;

async function parsePackageJson() {
  const pkg = await file(join(ROOT, "package.json")).json();

  const bin = pkg.bin || {};
  if (typeof bin === "string") throw new Error("bin must be an object");

  const exports = pkg.exports || {};
  if (typeof exports === "string") throw new Error("exports must be an object");

  const targets = pkg.build?.targets ?? {};
  if (typeof targets === "string") throw new Error("targets must be an object");

  const entries: Entry[] = [];
  const revisedPkg = { bin, exports, targets };

  if (bin) {
    const binMap = Object.entries(bin);
    revisedPkg.bin = Object.fromEntries(
      binMap.map(([key, val]) => [key, outputFile(val, ".js")]),
    );
    for (const [name, srcPath] of binMap) {
      console.log({ name, src: subdirFor(srcPath), srcPath });
      entries.push({
        bin: true,
        name,
        outDir: subdirFor(srcPath),
        src: join(ROOT, srcPath),
        target: "bun",
      });
    }
  }
  if (exports) {
    const exportsMap = Object.entries(exports);
    revisedPkg.exports = Object.fromEntries(
      exportsMap.map(([key, fileName]) => [
        key,
        {
          default: outputFile(fileName, ".js"),
          types: outputFile(fileName, ".d.ts"),
        },
      ]),
    );
    for (const [name, srcPath] of exportsMap) {
      const name = stripDot(name);
      entries.push({
        bin: false,
        name,
        outDir: subdirFor(srcPath),
        src: join(ROOT, stripDot(srcPath)),
        target: buildTargets[name] ?? "node",
      });
    }
  }

  return { entries, pkg, revisedPkg };
}

async function main() {
  const { pkg, entries, revisedPkg } = await parsePackageJson();

  await rm(OUTPUT_DIR, { force: true, recursive: true });
  await mkdir(OUTPUT_DIR, { recursive: true });

  const packageJson = deepmerge(pkg, revisedPkg);
  await writeFile(
    join(ROOT, "package.json"),
    `${JSON.stringify(packageJson, null, 2)}\n`,
  );

  for (const { name, src, outDir, target } of entries) {
    const result = await build({
      entrypoints: [src],
      external: ["drizzle-kit"],
      format: "esm",
      minify: true,
      outdir: join(OUTPUT_DIR, outDir),
      sourcemap: "none",
      target,
    });
    if (!result.success) {
      for (const log of result.logs) console.error(log);
      throw new Error(`Build failed for ${name}`);
    }
    // if (bin) {
    //   const outFile = basename(src).replace(/\.tsx?$/, ".js");
    //   await chmod(join(OUTPUT_DIR, outDir, outFile), 0o755);
    // }
  }

  const tsconfigPath = join(ROOT, "tsconfig.build.json");
  try {
    // await writeFile(tsconfigPath, JSON.stringify(TSCONFIG_BUILD, null, 2));
    // await $`bun tsc -p ${tsconfigPath}`.cwd(ROOT);

    const parsed = ts.parseJsonConfigFileContent(
      TSCONFIG_BUILD,
      ts.sys,
      process.cwd(),
    );

    const program = ts.createProgram({
      rootNames: parsed.fileNames,
      options: parsed.options,
    });

    const emitResult = program.emit();
  } finally {
    await rm(tsconfigPath, { force: true });
  }
}

await main();

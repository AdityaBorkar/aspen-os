#!/usr/bin/env bun

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

import { $, build, file } from "bun";
import deepmerge from "deepmerge";

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

type JsonValue = boolean | number | string | null | JsonValue[] | { [key: string]: JsonValue };

interface PackageJson {
  build?: BuildConfig;
  [key: string]: JsonValue | BuildConfig | undefined;
}

const $dev = process.argv.includes("--dev");
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
    paths: {
      "#/*": ["./src/*"],
    },
    rootDir: "src",
  },
  exclude: ["node_modules", OUTPUT_DIRNAME],
  extends: "./tsconfig.json",
  include: ["src/**/*.ts", "src/**/*.tsx"],
};
const relToSrc = (srcPath: string) => srcPath.replace(/^\.\/src\//, "");
const subdirFor = (srcPath: string) => dirname(relToSrc(srcPath));

/**
 * Resolve the emitted declaration entry for a module specifier like
 * `#/server/workflows` (resolvable via `<root>/src/<rest>` in source) inside the
 * build output. Returns the concrete `.d.ts` file when it exists, else null.
 */
function resolveModuleDeclaration(outputDir: string, rest: string): string | null {
  const base = join(outputDir, rest);
  if (existsSync(`${base}.d.ts`)) {
    return `${base}.d.ts`;
  }
  if (existsSync(join(base, "index.d.ts"))) {
    return join(base, "index.d.ts");
  }
  return null;
}

/**
 * Rewrite `#/*` package-local import specifiers in emitted declaration files to
 * relative paths. The build output mirrors `src`, so `#/server/x` refers to
 * `<output>/server/x`. Consumers resolve these files directly, so a bare `#/...`
 * specifier (which only the owning package's tsconfig maps) would otherwise be
 * unresolvable and typecheck as `any`.
 */
function rewriteDeclarationAliases(outputDir: string) {
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (entry.endsWith(".d.ts")) {
        rewriteFile(full, outputDir);
      }
    }
  };
  walk(outputDir);
}

function rewriteFile(filePath: string, outputDir: string) {
  const source = readFileSync(filePath, "utf8");
  const rewritten = source.replace(/from\s+["']#\/([^"']+)["']/g, (_match, rest: string) => {
    const target = resolveModuleDeclaration(outputDir, rest);
    if (!target) {
      return _match;
    }
    let specifier = relative(dirname(filePath), target).replace(/\.d\.ts$/, "");
    if (!specifier.startsWith(".")) {
      specifier = `./${specifier}`;
    }
    return `from "${specifier}"`;
  });
  if (rewritten !== source) {
    writeFileSync(filePath, rewritten);
  }
}

async function parsePackageJson() {
  const outputDirname = $dev ? "src" : OUTPUT_DIRNAME;
  const OUTPUT_DIR = join(ROOT, outputDirname);
  const outputFile = (srcPath: string, ext: ".js" | ".d.ts") =>
    `./${outputDirname}/${relToSrc(srcPath).replace(/(?:\.d\.ts|\.[^.]+)$/, ext)}`;

  const pkg: PackageJson = JSON.parse(await file(join(ROOT, "package.json")).text());

  // SAFETY: the build field is optional in package.json; when absent, {} is a valid
  // BuildConfig because every member of BuildConfig is optional.
  const buildConfig = pkg.build ?? {};
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

  console.log("Building...");
  await Promise.all(
    entries.map(async ({ name, src, outdir, target }) => {
      const result = await build({
        entrypoints: [src],
        format: "esm",
        // metafile: true,
        minify: false, // True,
        outdir,
        sourcemap: "external", // "none",
        splitting: false, // "true",
        target,
      });
      if (!result.success) {
        for (const log of result.logs) {
          console.error(log);
        }
        throw new Error(`Build failed for ${name}`);
      }
      // await Bun.write(`./meta-${name.replace(/\//g, "-")}.json`, JSON.stringify(result.metafile));
    }),
  );
  console.log("Build Successful");

  console.log("Generating types...");
  const tsconfigPath = join(ROOT, "tsconfig.build.json");
  try {
    await file(tsconfigPath).write(`${JSON.stringify(TSCONFIG_BUILD, null, 2)}\n`);
    await $`bun tsc -p ${tsconfigPath}`.cwd(ROOT);
  } finally {
    await rm(tsconfigPath, { force: true });
  }
  rewriteDeclarationAliases(join(ROOT, OUTPUT_DIRNAME));
  console.log("Type Generation Successful");
}

await main();

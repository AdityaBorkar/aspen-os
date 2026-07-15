#!/usr/bin/env bun

import { chmod, cp, mkdir, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

const ROOT = resolve(process.argv[2] ?? process.cwd());
const OUT_DIR = join(ROOT, ".output");

const pkg = await Bun.file(join(ROOT, "package.json")).json();
const external = Object.keys(pkg.dependencies ?? {});

const normalize = (p: string): string => p.replace(/^\.\//, "");
const toRelSrc = (p: string): string => normalize(p).replace(/^src\//, "");
const toOutSubdir = (p: string): string => dirname(toRelSrc(p));
const toOutputPath = (p: string, ext: ".js" | ".d.ts"): string =>
  `./.output/${toRelSrc(p).replace(/\.tsx?$/, ext)}`;

const publishing = (pkg.publishing ?? {}) as {
  bin?: Record<string, string> | string;
  exports?: Record<string, string>;
};

const sourceExports = (publishing.exports ?? pkg.exports) as
  | Record<string, string>
  | undefined;
const sourceBin = publishing.bin ?? pkg.bin;
const binMap = sourceBin
  ? typeof sourceBin === "string"
    ? { [pkg.name ?? "bin"]: sourceBin }
    : sourceBin
  : undefined;
const buildTargets = ((pkg.build ?? {}).targets ?? {}) as Record<
  string,
  "node" | "browser" | "bun"
>;

interface Entry {
  bin?: boolean;
  name: string;
  out: string;
  src: string;
  target: "node" | "browser" | "bun";
}

const entries: Entry[] = [];

if (sourceExports) {
  for (const [key, srcPath] of Object.entries(sourceExports)) {
    const name = normalize(key);
    entries.push({
      name,
      out: toOutSubdir(srcPath),
      src: join(ROOT, normalize(srcPath)),
      target: buildTargets[name] ?? "node",
    });
  }
}

if (binMap) {
  for (const [name, srcPath] of Object.entries(binMap)) {
    entries.push({
      bin: true,
      name,
      out: toOutSubdir(srcPath),
      src: join(ROOT, normalize(srcPath)),
      target: "bun",
    });
  }
}

await rm(OUT_DIR, { force: true, recursive: true });
await mkdir(OUT_DIR, { recursive: true });

for (const entry of entries) {
  const result = await Bun.build({
    entrypoints: [entry.src],
    external,
    format: "esm",
    minify: true,
    outdir: join(OUT_DIR, entry.out),
    sourcemap: "none",
    target: entry.target,
    ...(entry.bin ? { banner: "#!/usr/bin/env bun" } : {}),
  });

  if (!result.success) {
    for (const log of result.logs) {
      console.error(log);
    }
    throw new Error(`Build failed for ${entry.name}`);
  }

  if (entry.bin) {
    const outFile = basename(entry.src).replace(/\.tsx?$/, ".js");
    await chmod(join(OUT_DIR, entry.out, outFile), 0o755);
  }

  console.log(`  bundled ${entry.name}`);
}

const tsconfigBuild = {
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

const tsconfigPath = join(ROOT, "tsconfig.build.json");
await writeFile(tsconfigPath, JSON.stringify(tsconfigBuild, null, 2));

try {
  await Bun.$`bunx tsc -p ${tsconfigPath}`.cwd(ROOT);
  console.log("  generated type declarations");
} finally {
  await rm(tsconfigPath, { force: true });
}

if (!pkg.publishing) pkg.publishing = {};
if (sourceExports) pkg.publishing.exports = sourceExports;
if (binMap) pkg.publishing.bin = binMap;

if (binMap) {
  pkg.bin = Object.fromEntries(
    Object.entries(binMap).map(([key, val]) => [key, toOutputPath(val, ".js")]),
  );
}

if (sourceExports) {
  pkg.exports = Object.fromEntries(
    Object.entries(sourceExports).map(([key, val]) => [
      key,
      {
        default: toOutputPath(val, ".js"),
        types: toOutputPath(val, ".d.ts"),
      },
    ]),
  );
}

await writeFile(
  join(ROOT, "package.json"),
  `${JSON.stringify(pkg, null, 2)}\n`,
);

console.log("  updated package.json");
console.log(`\nBuild complete -> ${OUT_DIR}`);

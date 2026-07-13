import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";

const scriptDir = import.meta.dir;
const docsRoot = resolve(scriptDir, "..");
const packagesDir = resolve(docsRoot, "..", "packages");
const contentDocsDir = join(docsRoot, "content", "docs");

mkdirSync(contentDocsDir, { recursive: true });

const packages = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

let linked = 0;
let skipped = 0;

for (const pkg of packages) {
  const docsWwwDir = join(packagesDir, pkg, "docs-www");
  if (!existsSync(docsWwwDir)) continue;

  const linkPath = join(contentDocsDir, pkg);
  const target = relative(contentDocsDir, docsWwwDir);

  try {
    const stats = lstatSync(linkPath);
    if (stats.isSymbolicLink()) {
      const current = readlinkSync(linkPath);
      if (current === target) {
        console.log(`  \u2713 ${pkg} (already linked)`);
        skipped++;
        continue;
      }
      rmSync(linkPath);
    } else {
      console.warn(
        `  ! ${pkg} \u2014 skipping, ${stats.isDirectory() ? "directory" : "file"} exists`,
      );
      continue;
    }
  } catch {
    // ENOENT — path does not exist, proceed to create
  }

  symlinkSync(target, linkPath);
  console.log(`  \u2192 ${pkg}/docs-www \u2192 content/docs/${pkg}`);
  linked++;
}

console.log(`\n${linked} linked, ${skipped} already linked`);

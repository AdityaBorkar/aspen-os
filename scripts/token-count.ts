import { readFile } from "node:fs/promises";

import fg from "fast-glob";
import ignore from "ignore";
import { encoding_for_model } from "tiktoken";

const DIRECTORIES = [
  ".",
  "./.agents",
  "./docs",
  "./docs-www",
  "./examples/*",
  "./packages/*",
];

const BINARY_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "avif",
  "ico",
  "svg",
  "bmp",
  "tiff",
  "tif",
  "woff",
  "woff2",
  "ttf",
  "otf",
  "eot",
  "mp3",
  "mp4",
  "wav",
  "webm",
  "ogg",
  "pdf",
  "zip",
  "gz",
  "tar",
  "bz2",
  "7z",
  "exe",
  "dll",
  "so",
  "dylib",
  "bin",
  "dat",
  "db",
  "sqlite",
]);

const enc = encoding_for_model("gpt-5");

const gitignoreContent = await readFile(".gitignore", "utf8");
const ig = ignore().add(gitignoreContent);

const counts = new Map<string, number>();

const resolvedDirs: string[] = [];
for (const dir of DIRECTORIES) {
  if (dir.includes("*")) {
    const matches = await fg(dir, { onlyDirectories: true });
    resolvedDirs.push(...matches);
  } else {
    resolvedDirs.push(dir);
  }
}

for (const dir of resolvedDirs) {
  let tokens = 0;
  for (const file of await fg("**/*", { cwd: dir, onlyFiles: true })) {
    const relativePath = dir === "." ? file : `${dir}/${file}`;
    const normalizedPath = relativePath.replace(/^\.\//, "");
    if (ig.ignores(normalizedPath)) continue;

    const ext = file.split(".").pop()?.toLowerCase() ?? "";
    if (BINARY_EXTENSIONS.has(ext)) continue;

    try {
      const text = await readFile(relativePath, "utf8");
      tokens += enc.encode(text).length;
    } catch {}
  }
  counts.set(dir, tokens);
}

interface TreeNode {
  children: TreeNode[];
  name: string;
  tokens: number;
}

function buildTree(dirs: string[], countMap: Map<string, number>): TreeNode[] {
  const root: TreeNode = { children: [], name: ".", tokens: 0 };

  for (const dir of dirs) {
    const parts = dir.replace(/^\.\//, "").split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i] ?? "";
      let child = current.children.find((c) => c.name === part);
      if (!child) {
        child = { children: [], name: part, tokens: 0 };
        current.children.push(child);
      }
      if (i === parts.length - 1) {
        child.tokens = countMap.get(dir) ?? 0;
      }
      current = child;
    }
  }

  root.tokens = countMap.get(".") ?? 0;
  return root.children;
}

function formatTokens(tokens: number): string {
  return tokens.toLocaleString().padStart(12);
}

function printTree(nodes: TreeNode[], prefix = "") {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i] ?? { children: [], name: "", tokens: 0 };
    const isNodeLast = i === nodes.length - 1;
    const connector = isNodeLast ? "└── " : "├── ";
    const childPrefix = prefix + (isNodeLast ? "    " : "│   ");

    if (prefix === "" && isNodeLast && nodes.length === 1) {
      console.log(
        `${connector}${node.name}/ ${formatTokens(node.tokens)} tokens`,
      );
    } else {
      console.log(
        `${prefix}${connector}${node.name}/ ${formatTokens(node.tokens)} tokens`,
      );
    }

    printTree(node.children, childPrefix);
  }
}

console.log("\nToken counts by directory:\n");

const rootTokens = counts.get(".") ?? 0;
console.log(`./ ${formatTokens(rootTokens)} tokens`);
console.log("│");

const tree = buildTree(
  resolvedDirs.filter((d) => d !== "."),
  counts,
);
printTree(tree);

let total = 0;
for (const tokens of counts.values()) total += tokens;
console.log(`\nTotal: ${total.toLocaleString()} tokens\n`);

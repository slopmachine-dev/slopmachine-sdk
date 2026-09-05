import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const bumpType = process.argv[2] || "patch";
const corePkgPath = path.join(root, "packages/core/package.json");
const corePkg = JSON.parse(fs.readFileSync(corePkgPath, "utf8"));

let newVersion;
if (["major", "minor", "patch"].includes(bumpType)) {
  const parts = (corePkg.version || "0.1.0")
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
  if (bumpType === "major") {
    parts[0]++;
    parts[1] = 0;
    parts[2] = 0;
  } else if (bumpType === "minor") {
    parts[1]++;
    parts[2] = 0;
  } else {
    parts[2]++;
  }
  newVersion = `${parts[0]}.${parts[1]}.${parts[2]}`;
} else {
  newVersion = bumpType.replace(/^v/, "");
}

const pkgPaths = [
  "packages/core/package.json",
  "packages/react/package.json",
  "packages/svelte/package.json",
];

for (const relPath of pkgPaths) {
  const fullPath = path.join(root, relPath);
  if (!fs.existsSync(fullPath)) continue;
  const json = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  json.version = newVersion;
  fs.writeFileSync(fullPath, JSON.stringify(json, null, 2) + "\n", "utf8");
  console.log(`Updated ${json.name} -> v${newVersion}`);
}

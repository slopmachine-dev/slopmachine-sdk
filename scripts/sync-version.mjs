import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const corePkgPath = path.join(root, "packages/core/package.json");
const corePkgJson = JSON.parse(fs.readFileSync(corePkgPath, "utf8"));
const coreVersion = corePkgJson.version;

const targets = [
  {
    package: "packages/react",
    files: [
      "src/components/SlopImage.tsx",
      "src/components/SlopText.tsx",
      "src/components/SlopVideo.tsx",
    ],
  },
  {
    package: "packages/svelte",
    files: [
      "src/SlopImage.svelte",
      "src/SlopText.svelte",
      "src/SlopVideo.svelte",
    ],
  },
];

for (const target of targets) {
  const pkgPath = path.join(root, target.package, "package.json");
  if (!fs.existsSync(pkgPath)) continue;

  const pkgJson = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const version = pkgJson.version;

  let pkgUpdated = false;
  if (pkgJson.dependencies && pkgJson.dependencies["@slopmachine/core"]) {
    const newDependencyVersion = `^${coreVersion}`;
    if (pkgJson.dependencies["@slopmachine/core"] !== newDependencyVersion) {
      pkgJson.dependencies["@slopmachine/core"] = newDependencyVersion;
      pkgUpdated = true;
    }
  }

  if (pkgUpdated) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2) + "\n", "utf8");
    console.log(
      `Updated @slopmachine/core dependency in ${target.package} to ^${coreVersion}`,
    );
  }

  for (const file of target.files) {
    const filePath = path.join(root, target.package, file);
    if (!fs.existsSync(filePath)) continue;

    let content = fs.readFileSync(filePath, "utf8");

    // Replace `@version ...` or add it if missing
    // Match `@version` followed by any non-whitespace until newline
    const versionRegex = /@version\s+[^\r\n]+/g;

    if (versionRegex.test(content)) {
      content = content.replace(versionRegex, `@version ${version}`);
      fs.writeFileSync(filePath, content, "utf8");
      console.log(`Updated version in ${target.package}/${file} to ${version}`);
    } else {
      console.warn(`Could not find @version tag in ${target.package}/${file}`);
    }
  }
}

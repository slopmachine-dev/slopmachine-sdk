import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "tsup";

export default defineConfig({
  // `bin` is the `slopmachine` executable. It bundles `src/cli.ts`, which is
  // internal and deliberately not a package export.
  entry: ["src/index.ts", "src/bin.ts"],
  format: ["cjs", "esm"],
  // Only the public entry gets type declarations.
  dts: { entry: "src/index.ts" },
  sourcemap: true,
  clean: true,
  shims: true,
  onSuccess: async () => {
    const repoSkillDir = path.resolve(__dirname, "../../skills/slopmachine");
    const distSkillDir = path.resolve(__dirname, "dist/skills/slopmachine");
    if (fs.existsSync(repoSkillDir)) {
      fs.mkdirSync(path.dirname(distSkillDir), { recursive: true });
      fs.cpSync(repoSkillDir, distSkillDir, { recursive: true });
    }
  },
});

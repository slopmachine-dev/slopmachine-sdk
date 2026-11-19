import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts"],
  format: ["cjs", "esm"],
  dts: true,
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

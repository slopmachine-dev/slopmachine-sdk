#!/usr/bin/env node
// Executable entry point for the `slopmachine` bin. All logic lives in the
// side-effect-free `./cli` module.
import { runCli } from "./cli";

runCli().then((res) => {
  if (res.exitCode !== 0) {
    process.exitCode = res.exitCode;
  }
});

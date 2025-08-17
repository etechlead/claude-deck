import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "rollup-plugin-typescript2";
import json from "@rollup/plugin-json";

export default {
  input: "src/plugin.ts",
  output: {
    file: "pro.clever.claudedeck.sdPlugin/bin/plugin.cjs",
    format: "cjs",
    sourcemap: true
  },
  external: ["fs", "path", "os"],
  plugins: [
    json(),
    resolve({ preferBuiltins: true }),
    commonjs(),
    typescript({ tsconfig: "./tsconfig.json" })
  ]
};
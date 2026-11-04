import { defineConfig } from "oxlint";

const routerLinkBan = {
  name: "@tanstack/react-router",
  importNames: ["Link"],
  message: 'Import Link from @/design-system. It works the same, and variant="text" styles it.',
};

export default defineConfig({
  ignorePatterns: ["tools/oxlint/anti-slop/**", "src/routeTree.gen.ts", "src/api/generated/**"],
  jsPlugins: [{ name: "anti-slop", specifier: "./tools/oxlint/anti-slop/index.ts" }],
  rules: {
    "anti-slop/no-array-filter-map": "error",
    "anti-slop/no-reduce-accumulator-copy": "error",
    "anti-slop/no-chained-type-assertions": "error",
    "anti-slop/no-conditional-empty-object-spread": "error",
    "anti-slop/no-known-value-widening": "error",
    "anti-slop/no-module-mocking": "error",
    "anti-slop/no-object-parameters": "error",
    "anti-slop/no-reflect-apply": "error",
    "anti-slop/no-reflect-get": "error",
    "anti-slop/no-runtime-typeof": "error",
    "anti-slop/no-shape-in-symbol-names": "error",
    "anti-slop/no-unknown-parameters": "error",
    "anti-slop/no-unknown-returns": "error",
    "anti-slop/no-unknown-type-aliases": "error",
    "anti-slop/no-unsafe-dictionary-type": "error",
    "anti-slop/no-widen-then-assert": "error",
    "anti-slop/require-readable-spacing": "error",
    "anti-slop/require-safety-comment-for-type-assertion": "error",
    "no-restricted-imports": [
      "error",
      {
        paths: [routerLinkBan],
      },
    ],
  },
  overrides: [
    {
      // Only src/ has the alias. Config files at the root load through Node, so they stay relative.
      files: ["src/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: [routerLinkBan],
            patterns: [
              {
                group: ["./**", "../**"],
                message: "Import through the @/ alias, which maps to src/.",
              },
            ],
          },
        ],
      },
    },
  ],
});

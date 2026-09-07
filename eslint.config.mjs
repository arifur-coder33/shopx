import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: [".next/**", "node_modules/**", "public/**"] },
  {
    files: ["**/*.{js,jsx,mjs,cjs}"],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // The legacy codebase is JSX-heavy; enable unused checks after the
      // Next/ESLint dependency versions are aligned and React rules are added.
      "no-unused-vars": "off",
    },
  },
];

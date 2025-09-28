import js from "@eslint/js";
import globals from "globals";

/** @type {import("eslint").FlatConfig[]} */
export default [
  js.configs.recommended,

  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2018,
      globals: {
        ...globals.node,
        ...globals.es6,
      },
    },
    rules: {
      "no-restricted-globals": ["error", "name", "length"],
      "prefer-arrow-callback": "error",
      "quotes": ["error", "double", { allowTemplateLiterals: true }],
      "eol-last": ["error", "always"],
    },
  },

  {
    files: ["**/*.spec.*"],
    languageOptions: {
      globals: {
        ...globals.mocha,
      },
    },
    rules: {},
  },
];

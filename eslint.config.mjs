import parser from "@typescript-eslint/parser";
import plugin from "@typescript-eslint/eslint-plugin";

export default [
    {
        ignores: [
            "test/**/index.ts",
            "test/**/runTest.ts",
            "node_modules",
            "**/*.js",
            "src/test/suite/diagnose.test.ts",
        ],
    },
    {
        files: ["**/*.ts"],
        languageOptions: {
            parser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: "module",
            },
        },
        plugins: {
            "@typescript-eslint": plugin,
        },
        rules: {
            ...plugin.configs.recommended.rules,
            "no-throw-literal": "warn",
            "semi": "warn",
            "@typescript-eslint/no-use-before-define": "off",
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "@typescript-eslint/no-unused-vars": "off",
        },
    },
];

import { defineConfig } from "tsdown";

export default defineConfig([
	{
		entry: ["src/extension.ts"],
		format: "cjs",
		outDir: "dist",
		external: ["vscode"],
		outExtensions: () => ({ js: ".cjs" }),
	},
	{
		entry: ["src/webview/viewport/main.ts"],
		format: "esm",
		outDir: "dist/webview",
		outExtensions: () => ({ js: ".js" }),
	},
]);

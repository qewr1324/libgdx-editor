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
		entry: ["src/webview/viewport/main.ts", "src/webview/inspector/main.ts"],
		format: "esm",
		outDir: "dist/webview",
		noExternal: [/.*/],
		outExtensions: () => ({ js: ".js" }),
		platform: "browser",
	},
]);

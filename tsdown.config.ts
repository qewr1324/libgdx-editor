import { defineConfig } from "tsdown";

export default defineConfig([
	{
		entry: [
			"src/extension.ts",
			"src/webview/viewport/main.ts",
			"src/webview/inspector/main.ts",
			"src/webview/layers/main.ts",
			"src/webview/animator/main.ts", // 🆕
		],
		format: "cjs",
		outDir: "dist",
		external: ["vscode"],
		outExtensions: () => ({ js: ".cjs" }),
	},
	{
		entry: {
			viewport: "src/webview/viewport/main.ts",
			inspector: "src/webview/inspector/main.ts",
		},
		format: "esm",
		outDir: "dist/webview",
		noExternal: [/.*/],
		outExtensions: () => ({ js: ".js" }),
		platform: "browser",
	},
]);

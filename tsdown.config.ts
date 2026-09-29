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
		entry: {
			viewport: "src/webview/viewport/main.ts",
			inspector: "src/webview/inspector/main.ts",
			layers: "src/webview/layers/main.ts", // ← این خط حتماً باید باشه
		},
		format: "esm",
		outDir: "dist/webview",
		noExternal: [/.*/],
		outExtensions: () => ({ js: ".js" }),
		platform: "browser",
	},
]);

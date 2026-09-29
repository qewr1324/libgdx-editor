// src/webview/inspector/theme.ts
import { getTheme } from "./theme-types.js";
import { applyInspectorTheme } from "./theme-style.js";
import { currentScene, currentConfig, lastAppliedTheme, setLastAppliedTheme } from "./state.js";

export function applyEffectiveTheme(): void {
	const themeName = currentScene?.themeOverride ?? currentConfig?.defaultTheme ?? "win98";
	if (themeName === lastAppliedTheme) return;
	setLastAppliedTheme(themeName);
	applyInspectorTheme(getTheme(themeName));
}

// src/webview/inspector/theme.ts
import { applyTheme } from "../viewport/theme/theme-manager.js";
import { currentScene, currentConfig, lastAppliedTheme, setLastAppliedTheme } from "./state.js";

export function applyEffectiveTheme(): void {
	const themeName = currentScene?.themeOverride ?? currentConfig?.defaultTheme ?? "win98";
	if (themeName === lastAppliedTheme) return;
	setLastAppliedTheme(themeName);
	applyTheme(themeName, false);
}

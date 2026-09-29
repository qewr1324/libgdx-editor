// src/webview/inspector/theme.ts
// theme مخصوص Inspector — کاملاً مستقل از viewport/theme-manager
import { getTheme } from "./theme-types.js";
import { applyInspectorTheme } from "./theme-style.js";
import { currentScene, currentConfig, lastAppliedTheme, setLastAppliedTheme } from "./state.js";

export function applyEffectiveTheme(): void {
	const themeName = currentScene?.themeOverride ?? currentConfig?.defaultTheme ?? "win98";
	if (themeName === lastAppliedTheme) return;
	setLastAppliedTheme(themeName);
	applyInspectorTheme(getTheme(themeName), true);
}

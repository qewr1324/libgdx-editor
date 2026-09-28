import { THEMES, DEFAULT_THEME, getTheme, type Theme } from "./themes.js";
import { applyThemeCss } from "./theme-style.js";

let currentThemeName: string = DEFAULT_THEME;

export function getCurrentThemeName(): string {
	return currentThemeName;
}

export function getCurrentTheme(): Theme {
	return getTheme(currentThemeName);
}

export function applyTheme(name: string): void {
	const theme = getTheme(name);
	currentThemeName = theme.name;
	applyThemeCss(theme);
}

export function applyThemeFromScene(themeName: string | undefined): void {
	applyTheme(themeName ?? DEFAULT_THEME);
}

export function getAllThemes(): Theme[] {
	return Object.values(THEMES);
}

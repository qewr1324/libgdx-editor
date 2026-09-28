import { THEMES, DEFAULT_THEME, type Theme } from "./themes.js";
import { applyThemeCss } from "./theme-style.js";

let currentThemeName: string = DEFAULT_THEME;

/**
 * تم فعلی را برمی‌گرداند.
 */
export function getCurrentThemeName(): string {
	return currentThemeName;
}

/**
 * تم فعلی را به صورت آبجکت برمی‌گرداند.
 */
export function getCurrentTheme(): Theme {
	return THEMES[currentThemeName] ?? THEMES[DEFAULT_THEME];
}

/**
 * تم را اعمال می‌کند (CSS تزریق می‌شود).
 */
export function applyTheme(name: string): void {
	if (!THEMES[name]) {
		console.warn(`Theme "${name}" not found. Using default.`);
		name = DEFAULT_THEME;
	}
	currentThemeName = name;
	applyThemeCss(THEMES[name]);
}

/**
 * تم را از scene می‌خواند و اعمال می‌کند.
 * اگر scene تم نداشت، پیش‌فرض استفاده می‌شود.
 */
export function applyThemeFromScene(themeName: string | undefined): void {
	applyTheme(themeName ?? DEFAULT_THEME);
}

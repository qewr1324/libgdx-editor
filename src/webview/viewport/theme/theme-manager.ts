import { THEMES, DEFAULT_THEME, getTheme, type Theme } from "./themes.js";
import { buildThemeCss } from "./theme-style.js";

let currentThemeName: string = DEFAULT_THEME;

export function getCurrentThemeName(): string {
	return currentThemeName;
}

export function getCurrentTheme(): Theme {
	return getTheme(currentThemeName);
}

/**
 * تم را اعمال می‌کند. برای اطمینان، styleEl را کاملاً جایگزین می‌کند.
 */
export function applyTheme(name: string): void {
	const theme = getTheme(name);
	currentThemeName = theme.name;

	// پاک کردن style قدیمی
	const oldStyle = document.getElementById("viewport-theme");
	if (oldStyle && oldStyle.parentNode) {
		oldStyle.parentNode.removeChild(oldStyle);
	}

	// ساخت style جدید
	const styleEl = document.createElement("style");
	styleEl.id = "viewport-theme";
	styleEl.textContent = buildThemeCss(theme);
	document.head.appendChild(styleEl);

	// color-scheme
	document.documentElement.style.colorScheme = theme.name === "win98" ? "light" : "dark";

	// رویداد سفارشی برای کسانی که می‌خواهند بدانند تم عوض شده
	window.dispatchEvent(new CustomEvent("theme-changed", { detail: { theme } }));
}

export function applyThemeFromScene(themeName: string | undefined): void {
	applyTheme(themeName ?? DEFAULT_THEME);
}

export function getAllThemes(): Theme[] {
	return Object.values(THEMES);
}

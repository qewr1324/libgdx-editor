import { THEMES, DEFAULT_THEME, getTheme, type Theme } from "./themes.js";
import { buildThemeCss } from "./theme-style.js";

let currentThemeName: string = DEFAULT_THEME;

export function getCurrentThemeName(): string {
	return currentThemeName;
}

export function getCurrentTheme(): Theme {
	return getTheme(currentThemeName);
}

export function applyTheme(name: string): void {
	const theme = getTheme(name);

	// اگر همان تم قبلی است و style وجود دارد، هیچ کاری نکن
	if (theme.name === currentThemeName && document.getElementById("viewport-theme")) {
		return;
	}

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

	document.documentElement.style.colorScheme = theme.name === "win98" ? "light" : "dark";

	window.dispatchEvent(new CustomEvent("theme-changed", { detail: { theme } }));
}

export function applyThemeFromScene(themeName: string | undefined): void {
	applyTheme(themeName ?? DEFAULT_THEME);
}

export function getAllThemes(): Theme[] {
	return Object.values(THEMES);
}

// src/webview/components/theme.ts
import { currentConfig, lastAppliedTheme, setLastAppliedTheme } from "./state.js";

interface ThemeDef {
	bg: string;
	fg: string;
	border: string;
	borderLight: string;
	borderDark: string;
	panelBg: string;
	panelBorder: string;
	inputBg: string;
	inputFg: string;
	inputBorder: string;
	accent: string;
	accentFg: string;
	titleBg: string;
	fontFamily: string;
	fontSize: string;
	isClassic: boolean;
}

const THEMES: Record<string, ThemeDef> = {
	win98: {
		bg: "#c0c0c0",
		fg: "#000000",
		border: "#808080",
		borderLight: "#ffffff",
		borderDark: "#404040",
		panelBg: "#c0c0c0",
		panelBorder: "#808080",
		inputBg: "#ffffff",
		inputFg: "#000000",
		inputBorder: "#808080",
		accent: "#000080",
		accentFg: "#ffffff",
		titleBg: "linear-gradient(90deg, #000080, #1084d0)",
		fontFamily: "Tahoma, 'MS Sans Serif', sans-serif",
		fontSize: "11px",
		isClassic: true,
	},
	unity5: {
		bg: "#d8d8d8",
		fg: "#2b2b2b",
		border: "#b0b0b0",
		borderLight: "#f0f0f0",
		borderDark: "#808080",
		panelBg: "#e4e4e4",
		panelBorder: "#b0b0b0",
		inputBg: "#ffffff",
		inputFg: "#2b2b2b",
		inputBorder: "#b0b0b0",
		accent: "#4a90e2",
		accentFg: "#ffffff",
		titleBg: "linear-gradient(180deg, #f0f0f0, #d8d8d8)",
		fontFamily: "'Lucida Grande', 'Segoe UI', sans-serif",
		fontSize: "11px",
		isClassic: false,
	},
	unity6: {
		bg: "#282828",
		fg: "#e0e0e0",
		border: "#1e1e1e",
		borderLight: "#3a3a3a",
		borderDark: "#141414",
		panelBg: "#2d2d2d",
		panelBorder: "#1e1e1e",
		inputBg: "#1e1e1e",
		inputFg: "#e0e0e0",
		inputBorder: "#141414",
		accent: "#00a3ff",
		accentFg: "#ffffff",
		titleBg: "linear-gradient(180deg, #383838, #2d2d2d)",
		fontFamily: "'Inter', 'Segoe UI', sans-serif",
		fontSize: "11px",
		isClassic: false,
	},
	ue4: {
		bg: "#1e1e1e",
		fg: "#c8c8c8",
		border: "#0d0d0d",
		borderLight: "#3a3a3a",
		borderDark: "#000000",
		panelBg: "#252525",
		panelBorder: "#0d0d0d",
		inputBg: "#151515",
		inputFg: "#c8c8c8",
		inputBorder: "#0d0d0d",
		accent: "#0070e0",
		accentFg: "#ffffff",
		titleBg: "linear-gradient(180deg, #2c2c2c, #1e1e1e)",
		fontFamily: "'Roboto', 'Segoe UI', sans-serif",
		fontSize: "11px",
		isClassic: false,
	},
	ue5: {
		bg: "#151515",
		fg: "#d0d0d0",
		border: "#0a0a0a",
		borderLight: "#353535",
		borderDark: "#000000",
		panelBg: "#1f1f1f",
		panelBorder: "#0a0a0a",
		inputBg: "#0f0f0f",
		inputFg: "#d0d0d0",
		inputBorder: "#0a0a0a",
		accent: "#0084ff",
		accentFg: "#ffffff",
		titleBg: "linear-gradient(180deg, #2a2a2a, #1a1a1a)",
		fontFamily: "'Inter', 'Segoe UI', sans-serif",
		fontSize: "11px",
		isClassic: false,
	},
};

function getTheme(name: string | undefined): ThemeDef {
	if (name && THEMES[name]) return THEMES[name];
	return THEMES.win98;
}

export function applyEffectiveTheme(): void {
	const themeName = currentConfig?.defaultTheme ?? "win98";
	if (themeName === lastAppliedTheme) return;
	setLastAppliedTheme(themeName);
	applyTheme(getTheme(themeName));
}

function applyTheme(theme: ThemeDef): void {
	let styleEl = document.getElementById("components-theme") as HTMLStyleElement | null;
	if (!styleEl) {
		styleEl = document.createElement("style");
		styleEl.id = "components-theme";
		document.head.appendChild(styleEl);
	}
	styleEl.textContent = buildCss(theme);
	document.documentElement.style.colorScheme = theme.isClassic ? "light" : "dark";
}

function buildCss(t: ThemeDef): string {
	return `
		* { box-sizing: border-box; }
		html, body, #app {
			margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; user-select: none;
			background: ${t.isClassic ? t.bg : t.panelBg};
			color: ${t.fg};
			font-family: ${t.fontFamily};
			font-size: ${t.fontSize};
		}
		#app { overflow-y: auto; overflow-x: hidden; }

		.components-panel {
			padding: 6px 8px 8px 8px;
			background: ${t.isClassic ? t.bg : t.panelBg};
			color: ${t.fg};
			display: flex;
			flex-direction: column;
		}

		.components-empty {
			display: flex; flex-direction: column; align-items: center; justify-content: center;
			padding: 40px 20px; text-align: center; color: ${t.fg}; height: 100%;
		}
		.components-empty-icon { font-size: 36px; opacity: 0.3; margin-bottom: 12px; }
		.components-empty-title { font-size: 12px; font-weight: 600; margin-bottom: 6px; opacity: 0.7; }
		.components-empty-hint { font-size: 11px; opacity: 0.5; line-height: 1.5; }

		.components-section {
			border-bottom: 1px solid ${t.isClassic ? t.border : t.panelBorder};
		}
		.components-section-header {
			display: flex; align-items: center; gap: 4px; padding: 5px 8px; cursor: pointer;
			background: ${t.isClassic ? t.bg : t.titleBg}; color: ${t.fg};
			font-size: 11px; font-weight: 600;
		}
		.components-section-chevron { display: inline-flex; align-items: center; width: 12px; height: 12px; opacity: 0.7; flex-shrink: 0; }
		.components-section-label { flex: 1; }
		.components-section-body { padding: 6px 8px 8px 8px; }

		.components-add-wrap { position: relative; margin-top: 6px; }
		.components-add-btn {
			display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; padding: 5px 8px;
			background: ${t.isClassic ? t.bg : "transparent"}; color: ${t.fg};
			border: ${t.isClassic ? "2px" : "1px"} dashed ${t.border};
			border-radius: 3px; cursor: pointer; font-family: inherit; font-size: 11px; opacity: 0.75;
		}
		.components-add-btn:hover { opacity: 1; }
		.components-add-menu {
			display: none; position: absolute; top: calc(100% + 2px); left: 0; right: 0;
			background: ${t.isClassic ? t.bg : t.panelBg}; color: ${t.fg};
			border: 1px solid ${t.border};
			box-shadow: 0 2px 8px rgba(0,0,0,0.4); padding: 3px 0; z-index: 300; max-height: 240px; overflow-y: auto;
		}
		.components-add-menu.open { display: block; }
		.components-add-item {
			display: flex; align-items: center; gap: 8px; padding: 5px 10px; cursor: pointer;
			font-size: 11px; color: ${t.fg}; white-space: nowrap;
		}
		.components-add-item:hover { background: ${t.accent}; color: ${t.accentFg}; }

		.components-card {
			background: ${t.isClassic ? t.bg : "rgba(255,255,255,0.025)"};
			border: 1px solid ${t.isClassic ? t.border : t.panelBorder};
			border-radius: ${t.isClassic ? "0" : "3px"}; margin-bottom: 6px; overflow: hidden;
		}
		.components-card-header {
			display: flex; align-items: center; gap: 6px; padding: 4px 6px;
			background: ${t.isClassic ? t.bg : t.titleBg};
			border-bottom: 1px solid ${t.isClassic ? t.border : t.panelBorder};
		}
		.components-card-icon { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; font-size: 12px; flex-shrink: 0; }
		.components-card-label { flex: 1; font-size: 11px; font-weight: 600; color: ${t.fg}; }
		.components-card-remove {
			display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; padding: 0;
			background: transparent; border: none; color: ${t.fg}; cursor: pointer; opacity: 0.4; border-radius: 2px;
		}
		.components-card-remove:hover { opacity: 1; background: rgba(255,74,74,0.2); color: #ff4a4a; }
		.components-card-body { padding: 6px 6px 4px 6px; }

		.components-field { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; min-height: 22px; }
		.components-field.wide { display: block; margin-bottom: 6px; }
		.components-field-label { font-size: 11px; color: ${t.fg}; opacity: 0.75; flex-shrink: 0; min-width: 55px; max-width: 55px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
		.components-field.wide .components-field-label { display: block; min-width: auto; max-width: none; margin-bottom: 3px; }
		.components-field-input { flex: 1; min-width: 0; display: flex; align-items: center; gap: 4px; }
		.components-field input, .components-field select, .components-field textarea {
			width: 100%; background: ${t.inputBg}; color: ${t.inputFg};
			border: 1px solid ${t.inputBorder};
			padding: 3px 6px; border-radius: 3px; font-family: inherit; font-size: inherit; outline: none; min-width: 0;
		}
		.components-field input:focus, .components-field select:focus, .components-field textarea:focus {
			border-color: ${t.accent};
		}
		.components-field-row { display: flex; gap: 8px; margin-bottom: 4px; }
		.components-field-row .components-field { flex: 1; margin-bottom: 0; }
		.components-field-row .components-field-label { min-width: 20px; max-width: 20px; }

		.components-color-row { display: flex; gap: 4px; align-items: center; }
		.components-color-row input[type="color"] { width: 32px; height: 22px; padding: 1px; cursor: pointer; flex-shrink: 0; }
		.components-color-row input[type="text"] { flex: 1; font-family: monospace; font-size: 10px; min-width: 0; }

		.components-checkbox-row { display: flex; gap: 6px; align-items: center; cursor: pointer; font-size: 11px; color: ${t.fg}; }
		.components-checkbox-row input[type="checkbox"] { width: 13px; height: 13px; min-height: 13px; cursor: pointer; flex-shrink: 0; }

		.components-frames-textarea {
			width: 100%; font-family: "Courier New", monospace; font-size: 10px; resize: vertical; min-height: 44px;
			background: ${t.inputBg}; color: ${t.inputFg}; border: 1px solid ${t.inputBorder}; border-radius: 3px; padding: 4px 6px;
		}

		.components-hint { font-size: 10px; opacity: 0.55; font-style: italic; padding: 2px 0; color: ${t.fg}; }

		.components-reload {
			display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; padding: 0;
			background: ${t.isClassic ? t.bg : "transparent"}; color: ${t.fg};
			border: 1px solid ${t.border}; border-radius: 3px; cursor: pointer; font-size: 11px; flex-shrink: 0;
		}
		.components-reload:hover { background: rgba(255,255,255,0.1); }

		.components-empty-inner { font-size: 11px; opacity: 0.5; font-style: italic; padding: 6px 4px; color: ${t.fg}; text-align: center; }
	`;
}

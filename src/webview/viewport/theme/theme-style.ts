import type { Theme } from "./themes.js";

/**
 * CSS کامل را از تم می‌سازد. تمام استایل‌های UI را شامل می‌شود.
 */
export function buildThemeCss(theme: Theme): string {
	return `
		/* ============ Base ============ */
		:root {
			--theme-bg: ${theme.bg};
			--theme-fg: ${theme.fg};
			--theme-border: ${theme.border};
			--theme-accent: ${theme.accent};
			--theme-accent-fg: ${theme.accentFg};
			--theme-panel-bg: ${theme.panelBg};
			--theme-title-bg: ${theme.titleBg};
			--theme-title-fg: ${theme.titleFg};
		}

		html, body, #app {
			background: ${theme.bg};
			color: ${theme.fg};
			font-family: ${theme.fontFamily};
			font-size: ${theme.fontSize};
			font-weight: ${theme.fontWeight};
		}

		/* ============ Toolbar ============ */
		#toolbar {
			background: ${theme.toolbarBg};
			border: ${theme.isClassic ? "2px" : "1px"} solid ${theme.toolbarBorder};
			${theme.isClassic ? `border-color: ${theme.borderLight} ${theme.borderDark} ${theme.borderDark} ${theme.borderLight};` : ""}
			box-shadow: ${theme.toolbarShadow};
			padding: ${theme.toolbarPadding};
			gap: ${theme.toolbarGap};
			border-radius: ${theme.toolbarRadius};
		}

		#toolbar button {
			background: ${theme.btnBg};
			color: ${theme.btnFg};
			border: ${theme.isClassic ? "2px" : "1px"} solid ${theme.btnBorder};
			${theme.isClassic ? `border-color: ${theme.borderLight} ${theme.borderDark} ${theme.borderDark} ${theme.borderLight};` : ""}
			box-shadow: ${theme.btnBoxShadow};
			padding: ${theme.btnPadding};
			border-radius: ${theme.btnRadius};
			font-weight: ${theme.btnFontWeight};
			text-transform: ${theme.btnTextTransform};
			font-family: inherit;
			font-size: inherit;
			cursor: pointer;
			transition: background 0.1s, color 0.1s;
		}

		#toolbar button:hover {
			background: ${theme.btnHoverBg};
		}

		#toolbar button:active,
		#toolbar button.active {
			background: ${theme.btnActiveBg};
			color: ${theme.accentFg};
			box-shadow: ${theme.btnActiveBoxShadow};
			${theme.isClassic ? `border-color: ${theme.borderDark} ${theme.borderLight} ${theme.borderLight} ${theme.borderDark};` : ""}
		}

		#toolbar-info {
			margin-left: 8px;
			padding: 2px 8px;
			color: ${theme.fg};
			font-size: 11px;
			background: ${theme.isClassic ? theme.bg : "transparent"};
			${theme.isClassic ? `border: 2px solid; border-color: ${theme.border} ${theme.borderLight} ${theme.borderLight} ${theme.border}; box-shadow: inset 1px 1px 0 ${theme.borderDark};` : ""}
			min-height: 20px;
			line-height: 16px;
		}
		#toolbar-info:empty {
			display: none;
		}

		/* ============ Context Menu ============ */
		#context-menu {
			background: ${theme.menuBg};
			color: ${theme.menuFg};
			border: ${theme.isClassic ? "2px" : "1px"} solid ${theme.menuBorder};
			${theme.isClassic ? `border-color: ${theme.borderLight} ${theme.borderDark} ${theme.borderDark} ${theme.borderLight};` : ""}
			box-shadow: ${theme.menuShadow};
			border-radius: ${theme.menuRadius};
			padding: 2px;
			font-family: inherit;
			font-size: 11px;
		}

		.context-menu-item {
			padding: 4px 20px 4px 24px;
			cursor: pointer;
			display: flex;
			align-items: center;
			gap: 6px;
			color: ${theme.menuFg};
			white-space: nowrap;
		}

		.context-menu-item:hover {
			background: ${theme.menuHoverBg};
			color: ${theme.menuHoverFg};
		}

		.context-menu-separator {
			height: 2px;
			background: ${theme.isClassic ? theme.bg : theme.menuBorder};
			${theme.isClassic ? `border-top: 1px solid ${theme.borderDark}; border-bottom: 1px solid ${theme.borderLight};` : ""}
			margin: 3px 0;
		}

		/* ============ Inspector ============ */
		.empty-state {
			color: ${theme.fg};
			background: ${theme.bg};
		}

		.empty-icon { font-size: 48px; opacity: 0.4; margin-bottom: 12px; }
		.empty-text { font-size: 12px; font-weight: bold; margin-bottom: 6px; }
		.empty-hint { font-size: 11px; opacity: 0.7; line-height: 1.5; }

		.inspector { padding: 4px; }

		.section {
			margin-bottom: 10px;
			padding: ${theme.isClassic ? "14px 8px 8px 8px" : "8px"};
			background: ${theme.panelBg};
			border: ${theme.isClassic ? "2px" : "1px"} solid ${theme.panelBorder};
			${theme.isClassic ? `border-color: ${theme.borderDark} ${theme.borderLight} ${theme.borderLight} ${theme.borderDark}; box-shadow: inset 1px 1px 0 ${theme.borderDark};` : ""}
			border-radius: ${theme.panelRadius};
			position: relative;
		}

		.section-title {
			${theme.isClassic ? `position: absolute; top: -8px; left: 8px; padding: 0 4px; background: ${theme.panelBg};` : "position: static; padding: 0; background: transparent; margin-bottom: 8px;"}
			font-size: 11px;
			font-weight: ${theme.isClassic ? "bold" : "600"};
			color: ${theme.fg};
			${theme.isClassic ? "text-transform: none; letter-spacing: 0;" : "text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7;"}
		}

		.header-section {
			background: ${theme.titleBg};
			padding: ${theme.isClassic ? "6px" : "10px"};
			border: ${theme.isClassic ? `2px solid; border-color: ${theme.borderLight} ${theme.borderDark} ${theme.borderDark} ${theme.borderLight}; box-shadow: inset -1px -1px 0 ${theme.border}, inset 1px 1px 0 #dfdfdf;` : `1px solid ${theme.panelBorder};`}
			border-radius: ${theme.panelRadius};
		}

		.header-section .object-id {
			color: ${theme.titleFg};
			${theme.isClassic ? "" : "opacity: 0.7;"}
		}

		.header-top {
			display: flex;
			gap: 6px;
			align-items: center;
			margin-bottom: 4px;
		}

		.object-type-badge {
			${theme.isClassic ? `background: ${theme.bg}; color: ${theme.fg}; border: 2px solid; border-color: ${theme.borderLight} ${theme.borderDark} ${theme.borderDark} ${theme.borderLight}; box-shadow: inset -1px -1px 0 ${theme.borderDark}, inset 1px 1px 0 ${theme.borderLight};` : `background: ${theme.accent}; color: ${theme.accentFg}; border: none; border-radius: 10px;`}
			font-size: 10px;
			padding: ${theme.isClassic ? "1px 8px" : "2px 8px"};
			font-weight: bold;
			text-transform: uppercase;
		}

		.type-sprite { background: #4a9eff; color: #ffffff; }
		.type-shape { background: #ff4a4a; color: #ffffff; }
		.type-text { background: #ffffff; color: #1a1a1a; }
		.type-group { background: #9b59b6; color: #ffffff; }
		.type-scene { background: #f39c12; color: #ffffff; }

		.object-id {
			font-size: 10px;
			color: ${theme.fg};
			font-family: monospace;
			word-break: break-all;
		}

		.btn-icon {
			background: ${theme.isClassic ? theme.bg : "transparent"};
			border: ${theme.isClassic ? `2px solid; border-color: ${theme.borderLight} ${theme.borderDark} ${theme.borderDark} ${theme.borderLight}; box-shadow: inset -1px -1px 0 ${theme.border}, inset 1px 1px 0 ${theme.borderLight};` : "none"};
			border-radius: ${theme.isClassic ? "0" : "4px"};
			cursor: pointer;
			font-size: 11px;
			padding: ${theme.isClassic ? "2px 6px" : "4px"};
			min-width: 24px;
			min-height: 22px;
			color: ${theme.fg};
			margin-left: auto;
		}

		.btn-icon:hover {
			background: ${theme.isClassic ? theme.bg : theme.btnHoverBg};
		}

		.field {
			margin-bottom: 6px;
			display: flex;
			flex-direction: column;
			gap: 2px;
			flex: 1;
		}

		.field label {
			font-size: 11px;
			color: ${theme.fg};
		}

		.field input,
		.field select,
		.field textarea {
			background: ${theme.inputBg};
			color: ${theme.inputFg};
			border: ${theme.isClassic ? "2px" : "1px"} solid ${theme.inputBorder};
			${theme.isClassic ? `border-color: ${theme.border} ${theme.borderLight} ${theme.borderLight} ${theme.border}; box-shadow: inset 1px 1px 0 ${theme.borderDark};` : ""}
			padding: ${theme.inputPadding};
			border-radius: ${theme.inputRadius};
			font-family: inherit;
			font-size: inherit;
			width: 100%;
			box-sizing: border-box;
			outline: none;
		}

		.field input:focus,
		.field select:focus,
		.field textarea:focus {
			${theme.isClassic ? `outline: 1px dotted ${theme.fg}; outline-offset: -4px;` : `border-color: ${theme.inputFocusBorder}; box-shadow: 0 0 0 2px ${hexToRgba(theme.inputFocusBorder, 0.2)};`}
		}

		.field-row {
			display: flex;
			gap: 6px;
		}

		.color-row {
			display: flex;
			gap: 4px;
			align-items: center;
		}

		.color-row input[type="color"] {
			width: 32px;
			height: 22px;
			padding: 1px;
			border: ${theme.isClassic ? "2px" : "1px"} solid ${theme.inputBorder};
			border-radius: ${theme.inputRadius};
			background: ${theme.isClassic ? theme.bg : theme.inputBg};
			cursor: pointer;
		}

		.color-row input[type="text"] { flex: 1; }

		.properties-json {
			font-family: "Courier New", monospace !important;
			font-size: 11px !important;
			resize: vertical;
			min-height: 60px;
		}

		.checkbox-row {
			display: flex;
			gap: 6px;
			align-items: center;
			cursor: pointer;
		}

		.checkbox-row input[type="checkbox"] {
			width: 13px;
			height: 13px;
			min-height: 13px;
			appearance: none;
			-webkit-appearance: none;
			background: ${theme.inputBg};
			border: ${theme.isClassic ? "2px" : "1px"} solid ${theme.inputBorder};
			${theme.isClassic ? `border-color: ${theme.border} ${theme.borderLight} ${theme.borderLight} ${theme.border};` : ""}
			border-radius: ${theme.isClassic ? "0" : "2px"};
			position: relative;
			cursor: pointer;
		}

		.checkbox-row input[type="checkbox"]:checked {
			${theme.isClassic ? "" : `background: ${theme.accent}; border-color: ${theme.accent};`}
		}

		.checkbox-row input[type="checkbox"]:checked::after {
			content: "✓";
			position: absolute;
			left: ${theme.isClassic ? "0" : "1px"};
			top: ${theme.isClassic ? "-3px" : "-2px"};
			font-size: ${theme.isClassic ? "13px" : "12px"};
			font-weight: bold;
			color: ${theme.isClassic ? theme.fg : theme.accentFg};
		}

		.texture-row {
			display: flex;
			gap: 6px;
			align-items: center;
			font-family: monospace;
			font-size: 11px;
			color: ${theme.fg};
			word-break: break-all;
			background: ${theme.inputBg};
			padding: 4px 6px;
			border: ${theme.isClassic ? "2px" : "1px"} solid ${theme.inputBorder};
			border-radius: ${theme.inputRadius};
		}

		/* ============ Rulers ============ */
		#ruler-h, #ruler-v {
			background: ${theme.isClassic ? theme.bg : theme.bg};
		}

		#ruler-h {
			border-bottom: ${theme.isClassic ? `2px solid ${theme.borderLight}; box-shadow: 0 1px 0 ${theme.border};` : `1px solid ${theme.border};`};
		}

		#ruler-v {
			border-right: ${theme.isClassic ? `2px solid ${theme.borderLight}; box-shadow: 1px 0 0 ${theme.border};` : `1px solid ${theme.border};`};
		}

		#ruler-info {
			background: ${theme.isClassic ? theme.bg : theme.panelBg};
			color: ${theme.fg};
			border: ${theme.isClassic ? `2px solid; border-color: ${theme.border} ${theme.borderLight} ${theme.borderLight} ${theme.border}; box-shadow: inset 1px 1px 0 ${theme.borderDark};` : `1px solid ${theme.border};`};
			border-radius: ${theme.inputRadius};
		}

		/* ============ Scrollbar ============ */
		body::-webkit-scrollbar,
		#app::-webkit-scrollbar {
			width: 16px;
			height: 16px;
		}

		body::-webkit-scrollbar-track,
		#app::-webkit-scrollbar-track {
			background: ${theme.scrollTrack};
		}

		body::-webkit-scrollbar-thumb,
		#app::-webkit-scrollbar-thumb {
			background: ${theme.scrollThumb};
			border: ${theme.isClassic ? `2px solid; border-color: ${theme.borderLight} ${theme.borderDark} ${theme.borderDark} ${theme.borderLight};` : `1px solid ${theme.scrollThumbBorder}; border-radius: 5px;`};
		}
	`;
}

function hexToRgba(hex: string, alpha: number): string {
	const h = hex.replace("#", "");
	const r = parseInt(h.substring(0, 2), 16);
	const g = parseInt(h.substring(2, 4), 16);
	const b = parseInt(h.substring(4, 6), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * CSS تم را به document تزریق می‌کند. اگر style موجود باشد، محتوایش را عوض می‌کند.
 */
export function applyThemeCss(theme: Theme): void {
	let styleEl = document.getElementById("viewport-theme") as HTMLStyleElement | null;
	if (!styleEl) {
		styleEl = document.createElement("style");
		styleEl.id = "viewport-theme";
		document.head.appendChild(styleEl);
	}
	styleEl.textContent = buildThemeCss(theme);
	// برای تم روشن/تیره، color-scheme را ست کن
	document.documentElement.style.colorScheme = theme.name === "win98" ? "light" : "dark";
}

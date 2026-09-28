import type { Theme } from "./themes.js";

/**
 * CSS را بر اساس تم می‌سازد.
 */
export function buildThemeCss(theme: Theme): string {
	// اگر تم win98 است، CSS کلاسیک استفاده کن
	if (theme.name === "win98") {
		return buildWin98Css(theme);
	}
	return buildModernCss(theme);
}

function buildWin98Css(theme: Theme): string {
	return `
		:root {
			--win-bg: ${theme.bg};
			--win-text: ${theme.fg};
			--win-title-active: #000080;
			--win-highlight: ${theme.accent};
		}

		html, body, #app {
			background: ${theme.bg};
			color: ${theme.fg};
			font-family: ${theme.fontFamily};
			font-size: ${theme.fontSize};
		}

		#toolbar {
			background: ${theme.toolbarBg};
			border: 2px solid;
			border-color: ${theme.borderLight} ${theme.borderDark} ${theme.borderDark} ${theme.borderLight};
			box-shadow: ${theme.toolbarShadow};
			padding: ${theme.toolbarPadding};
			gap: ${theme.toolbarGap};
			border-radius: ${theme.toolbarRadius};
		}

		#toolbar button {
			background: ${theme.btnBg};
			color: ${theme.btnFg};
			border: 2px solid;
			border-color: ${theme.borderLight} ${theme.borderDark} ${theme.borderDark} ${theme.borderLight};
			box-shadow: ${theme.btnBoxShadow};
			padding: ${theme.btnPadding};
			border-radius: ${theme.btnRadius};
			font-weight: ${theme.btnFontWeight};
			text-transform: ${theme.btnTextTransform};
		}

		#toolbar button.active {
			border-color: ${theme.borderDark} ${theme.borderLight} ${theme.borderLight} ${theme.borderDark};
			box-shadow: ${theme.btnActiveBoxShadow};
		}

		#context-menu {
			background: ${theme.menuBg};
			color: ${theme.menuFg};
			border: 2px solid;
			border-color: ${theme.borderLight} ${theme.borderDark} ${theme.borderDark} ${theme.borderLight};
			box-shadow: ${theme.menuShadow};
			border-radius: ${theme.menuRadius};
		}

		.context-menu-item:hover {
			background: ${theme.menuHoverBg};
			color: ${theme.menuHoverFg};
		}

		.section {
			background: ${theme.panelBg};
			border: 2px solid;
			border-color: ${theme.border} ${theme.borderLight} ${theme.borderLight} ${theme.border};
			box-shadow: inset 1px 1px 0 ${theme.borderDark};
			border-radius: ${theme.panelRadius};
		}

		.section-title {
			background: ${theme.panelBg};
			color: ${theme.fg};
		}

		.header-section {
			background: ${theme.titleBg};
			border: 2px solid;
			border-color: ${theme.borderLight} ${theme.borderDark} ${theme.borderDark} ${theme.borderLight};
			box-shadow: inset -1px -1px 0 ${theme.border}, inset 1px 1px 0 #dfdfdf;
		}

		.header-section .object-id {
			color: ${theme.titleFg};
		}

		.object-type-badge {
			background: ${theme.bg};
			color: ${theme.fg};
			border: 2px solid;
			border-color: ${theme.borderLight} ${theme.borderDark} ${theme.borderDark} ${theme.borderLight};
		}

		.type-sprite { background: #000080; color: #ffffff; }
		.type-shape { background: #800000; color: #ffffff; }
		.type-text { background: #ffffff; color: #000000; }
		.type-group { background: #800080; color: #ffffff; }
		.type-scene { background: #000080; color: #ffffff; }

		.btn-icon {
			background: ${theme.btnBg};
			color: ${theme.btnFg};
			border: 2px solid;
			border-color: ${theme.borderLight} ${theme.borderDark} ${theme.borderDark} ${theme.borderLight};
			box-shadow: ${theme.btnBoxShadow};
		}

		.field input, .field select, .field textarea {
			background: ${theme.inputBg};
			color: ${theme.inputFg};
			border: 2px solid;
			border-color: ${theme.border} ${theme.borderLight} ${theme.borderLight} ${theme.border};
			box-shadow: inset 1px 1px 0 ${theme.borderDark};
			padding: ${theme.inputPadding};
			border-radius: ${theme.inputRadius};
		}

		.field input:focus, .field select:focus, .field textarea:focus {
			outline: 1px dotted ${theme.fg};
			outline-offset: -4px;
		}

		.color-row input[type="color"] {
			border: 2px solid;
			border-color: ${theme.border} ${theme.borderLight} ${theme.borderLight} ${theme.border};
			background: ${theme.bg};
		}

		.texture-row {
			background: ${theme.inputBg};
			color: ${theme.inputFg};
			border: 2px solid;
			border-color: ${theme.border} ${theme.borderLight} ${theme.borderLight} ${theme.border};
		}

		.checkbox-row input[type="checkbox"] {
			background: ${theme.inputBg};
			border: 2px solid;
			border-color: ${theme.border} ${theme.borderLight} ${theme.borderLight} ${theme.border};
		}

		.checkbox-row input[type="checkbox"]:checked::after {
			color: ${theme.fg};
		}

		#ruler-h, #ruler-v {
			background: ${theme.bg};
		}

		#ruler-info {
			background: ${theme.bg};
			color: ${theme.fg};
			border: 2px solid;
			border-color: ${theme.border} ${theme.borderLight} ${theme.borderLight} ${theme.border};
			box-shadow: inset 1px 1px 0 ${theme.borderDark};
		}
	`;
}

function buildModernCss(theme: Theme): string {
	return `
		:root {
			--modern-bg: ${theme.bg};
			--modern-panel: ${theme.panelBg};
			--modern-border: ${theme.panelBorder};
			--modern-accent: ${theme.accent};
		}

		html, body, #app {
			background: ${theme.bg};
			color: ${theme.fg};
			font-family: ${theme.fontFamily};
			font-size: ${theme.fontSize};
			font-weight: ${theme.fontWeight};
		}

		#toolbar {
			background: ${theme.toolbarBg};
			border: 1px solid ${theme.toolbarBorder};
			box-shadow: ${theme.toolbarShadow};
			padding: ${theme.toolbarPadding};
			gap: ${theme.toolbarGap};
			border-radius: ${theme.toolbarRadius};
		}

		#toolbar button {
			background: ${theme.btnBg};
			color: ${theme.btnFg};
			border: 1px solid ${theme.btnBorder};
			box-shadow: ${theme.btnBoxShadow};
			padding: ${theme.btnPadding};
			border-radius: ${theme.btnRadius};
			font-weight: ${theme.btnFontWeight};
			text-transform: ${theme.btnTextTransform};
			transition: background 0.15s, box-shadow 0.15s;
		}

		#toolbar button:hover {
			background: ${theme.btnHoverBg};
		}

		#toolbar button:active {
			background: ${theme.btnActiveBg};
			color: ${theme.accentFg};
		}

		#toolbar button.active {
			background: ${theme.btnActiveBg};
			color: ${theme.accentFg};
			box-shadow: ${theme.btnActiveBoxShadow};
		}

		#toolbar button:focus {
			outline: 1px solid ${theme.accent};
			outline-offset: 1px;
		}

		#context-menu {
			background: ${theme.menuBg};
			color: ${theme.menuFg};
			border: 1px solid ${theme.menuBorder};
			box-shadow: ${theme.menuShadow};
			border-radius: ${theme.menuRadius};
			padding: 4px 0;
		}

		.context-menu-item:hover {
			background: ${theme.menuHoverBg};
			color: ${theme.menuHoverFg};
		}

		.context-menu-separator {
			background: ${theme.menuBorder};
			margin: 4px 0;
		}

		.section {
			background: ${theme.panelBg};
			border: 1px solid ${theme.panelBorder};
			border-radius: ${theme.panelRadius};
			margin-bottom: 10px;
			padding: 8px;
		}

		.section-title {
			color: ${theme.fg};
			opacity: 0.7;
			font-size: 10px;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.5px;
			margin-bottom: 8px;
			background: transparent;
			position: static;
			padding: 0;
		}

		.header-section {
			background: ${theme.titleBg};
			border: 1px solid ${theme.panelBorder};
			border-radius: ${theme.panelRadius};
			padding: 10px;
		}

		.header-section .object-id {
			color: ${theme.titleFg};
			opacity: 0.7;
		}

		.object-type-badge {
			background: ${theme.accent};
			color: ${theme.accentFg};
			border: none;
			border-radius: 10px;
			font-size: 10px;
			padding: 2px 8px;
			font-weight: 600;
			text-transform: uppercase;
		}

		.type-sprite { background: #4a9eff; color: #ffffff; }
		.type-shape { background: #ff4a4a; color: #ffffff; }
		.type-text { background: #ffffff; color: #1a1a1a; }
		.type-group { background: #9b59b6; color: #ffffff; }
		.type-scene { background: #f39c12; color: #ffffff; }

		.btn-icon {
			background: transparent;
			color: ${theme.fg};
			border: none;
			border-radius: 4px;
			cursor: pointer;
			padding: 4px;
			font-size: 14px;
		}

		.btn-icon:hover {
			background: ${theme.btnHoverBg};
		}

		.field input, .field select, .field textarea {
			background: ${theme.inputBg};
			color: ${theme.inputFg};
			border: 1px solid ${theme.inputBorder};
			border-radius: ${theme.inputRadius};
			padding: ${theme.inputPadding};
			font-family: inherit;
			font-size: ${theme.fontSize};
			width: 100%;
			box-sizing: border-box;
			outline: none;
			transition: border-color 0.15s, box-shadow 0.15s;
		}

		.field input:focus, .field select:focus, .field textarea:focus {
			border-color: ${theme.inputFocusBorder};
			box-shadow: 0 0 0 2px ${hexToRgba(theme.inputFocusBorder, 0.2)};
		}

		.color-row input[type="color"] {
			border: 1px solid ${theme.inputBorder};
			border-radius: ${theme.inputRadius};
			background: ${theme.inputBg};
		}

		.texture-row {
			background: ${theme.inputBg};
			color: ${theme.inputFg};
			border: 1px solid ${theme.inputBorder};
			border-radius: ${theme.inputRadius};
			padding: 4px 8px;
		}

		.checkbox-row input[type="checkbox"] {
			width: 14px;
			height: 14px;
			appearance: none;
			-webkit-appearance: none;
			background: ${theme.inputBg};
			border: 1px solid ${theme.inputBorder};
			border-radius: 2px;
			position: relative;
			cursor: pointer;
		}

		.checkbox-row input[type="checkbox"]:checked {
			background: ${theme.accent};
			border-color: ${theme.accent};
		}

		.checkbox-row input[type="checkbox"]:checked::after {
			content: "✓";
			position: absolute;
			left: 1px;
			top: -2px;
			font-size: 12px;
			font-weight: bold;
			color: ${theme.accentFg};
		}

		#ruler-h, #ruler-v {
			background: ${theme.bg};
			border-color: ${theme.border};
		}

		#ruler-h {
			border-bottom: 1px solid ${theme.border};
			box-shadow: none;
		}

		#ruler-v {
			border-right: 1px solid ${theme.border};
			box-shadow: none;
		}

		#ruler-info {
			background: ${theme.panelBg};
			color: ${theme.fg};
			border: 1px solid ${theme.border};
			border-radius: ${theme.inputRadius};
			padding: 2px 8px;
		}

		.empty-state {
			color: ${theme.fg};
		}

		.empty-icon { opacity: 0.3; }

		body::-webkit-scrollbar,
		#app::-webkit-scrollbar {
			width: 10px;
			height: 10px;
		}

		body::-webkit-scrollbar-track,
		#app::-webkit-scrollbar-track {
			background: ${theme.scrollTrack};
		}

		body::-webkit-scrollbar-thumb,
		#app::-webkit-scrollbar-thumb {
			background: ${theme.scrollThumb};
			border: 1px solid ${theme.scrollThumbBorder};
			border-radius: 5px;
		}

		body::-webkit-scrollbar-thumb:hover,
		#app::-webkit-scrollbar-thumb:hover {
			background: ${theme.btnHoverBg};
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
 * CSS تم را به document تزریق می‌کند.
 */
export function applyThemeCss(theme: Theme): void {
	let styleEl = document.getElementById("viewport-theme") as HTMLStyleElement | null;
	if (!styleEl) {
		styleEl = document.createElement("style");
		styleEl.id = "viewport-theme";
		document.head.appendChild(styleEl);
	}
	styleEl.textContent = buildThemeCss(theme);
}

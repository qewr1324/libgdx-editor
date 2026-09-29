import type { Theme } from "./themes.js";

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

		/* ============ Toolbar (Unity-like) ============ */
		#toolbar {
			background: ${theme.toolbarBg};
			border: ${theme.isClassic ? "2px" : "1px"} solid ${theme.toolbarBorder};
			${theme.isClassic ? `border-color: ${theme.borderLight} ${theme.borderDark} ${theme.borderDark} ${theme.borderLight};` : ""}
			box-shadow: ${theme.toolbarShadow};
			padding: ${theme.toolbarPadding};
			border-radius: ${theme.toolbarRadius};
			display: flex;
			align-items: center;
			gap: 4px;
		}

		.tb-group {
			position: relative;
			display: inline-flex;
			align-items: center;
		}

		.tb-btn {
			display: inline-flex;
			align-items: center;
			gap: 4px;
			cursor: pointer;
			font-family: inherit;
			font-size: inherit;
			padding: ${theme.btnPadding};
			background: ${theme.btnBg};
			color: ${theme.btnFg};
			border: ${theme.isClassic ? "2px" : "1px"} solid ${theme.btnBorder};
			${theme.isClassic ? `border-color: ${theme.borderLight} ${theme.borderDark} ${theme.borderDark} ${theme.borderLight};` : ""}
			border-radius: ${theme.btnRadius};
			box-shadow: ${theme.btnBoxShadow};
			min-height: 22px;
			white-space: nowrap;
			transition: background 0.1s, color 0.1s;
		}

		.tb-btn:hover {
			background: ${theme.btnHoverBg};
		}

		.tb-btn:active {
			${theme.isClassic ? `border-color: ${theme.borderDark} ${theme.borderLight} ${theme.borderLight} ${theme.borderDark};` : ""}
		}

		.tb-btn.active {
			background: ${theme.btnActiveBg};
			color: ${theme.accentFg};
			box-shadow: ${theme.btnActiveBoxShadow};
			${theme.isClassic ? `border-color: ${theme.borderDark} ${theme.borderLight} ${theme.borderLight} ${theme.borderDark};` : ""}
		}

		.tb-btn-primary {
			font-weight: 600;
			background: ${theme.accent};
			color: ${theme.accentFg};
			border-color: ${theme.accent};
		}

		.tb-btn-primary:hover {
			background: ${theme.accent};
			filter: brightness(1.15);
		}

		.tb-caret {
			font-size: 8px;
			opacity: 0.7;
			margin-left: 2px;
		}

		.tb-sep {
			width: 1px;
			align-self: stretch;
			margin: 0 4px;
			background: ${theme.isClassic ? theme.borderDark : theme.border};
			${theme.isClassic ? `box-shadow: 1px 0 0 ${theme.borderLight};` : ""}
		}

		.tb-spacer {
			flex: 1;
		}

		.tb-segmented {
			display: inline-flex;
			border-radius: ${theme.btnRadius};
			overflow: hidden;
			border: ${theme.isClassic ? "2px" : "1px"} solid ${theme.btnBorder};
			${theme.isClassic ? `border-color: ${theme.borderLight} ${theme.borderDark} ${theme.borderDark} ${theme.borderLight};` : ""}
			box-shadow: ${theme.btnBoxShadow};
		}

		.tb-seg {
			padding: ${theme.btnPadding};
			background: ${theme.btnBg};
			color: ${theme.btnFg};
			border: none;
			cursor: pointer;
			font-family: inherit;
			font-size: inherit;
			border-right: 1px solid ${theme.border};
			min-height: 22px;
			white-space: nowrap;
		}

		.tb-seg:last-child {
			border-right: none;
		}

		.tb-seg.active {
			background: ${theme.btnActiveBg};
			color: ${theme.accentFg};
			box-shadow: ${theme.btnActiveBoxShadow};
		}

		.tb-seg:hover:not(.active) {
			background: ${theme.btnHoverBg};
		}

		.tb-dropdown {
			display: none;
			position: absolute;
			top: calc(100% + 4px);
			left: 0;
			min-width: 200px;
			background: ${theme.menuBg};
			color: ${theme.menuFg};
			border: ${theme.isClassic ? "2px" : "1px"} solid ${theme.menuBorder};
			${theme.isClassic ? `border-color: ${theme.borderLight} ${theme.borderDark} ${theme.borderDark} ${theme.borderLight};` : ""}
			border-radius: ${theme.menuRadius};
			box-shadow: ${theme.menuShadow};
			padding: 4px 0;
			z-index: 200;
		}

		.tb-dropdown.open {
			display: block;
		}

		.tb-menu-item {
			display: flex;
			align-items: center;
			gap: 8px;
			padding: 5px 12px;
			cursor: pointer;
			white-space: nowrap;
			color: ${theme.menuFg};
			font-size: inherit;
			font-family: inherit;
		}

		.tb-menu-item:hover {
			background: ${theme.menuHoverBg};
			color: ${theme.menuHoverFg};
		}

		.tb-menu-item.checked .tb-check {
			opacity: 1;
		}

		.tb-check {
			width: 12px;
			display: inline-block;
			text-align: center;
			opacity: 0;
			font-weight: bold;
		}

		.tb-menu-sep {
			height: 1px;
			margin: 4px 0;
			background: ${theme.isClassic ? theme.borderDark : theme.border};
		}

		.shape-icon {
			display: inline-block;
			width: 16px;
			text-align: center;
			font-size: 14px;
			line-height: 1;
		}

		#toolbar-info {
			margin-left: 8px;
			margin-right: 6px;
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

		/* ============ Inspector — Unity Style ============ */
		.inspector {
			padding: 0;
			background: ${theme.isClassic ? theme.bg : theme.panelBg};
			color: ${theme.fg};
			display: flex;
			flex-direction: column;
			font-size: 11px;
		}

		/* --- Header --- */
		.inspector-header {
			display: flex;
			align-items: center;
			gap: 6px;
			padding: 6px 8px;
			background: ${theme.isClassic ? theme.bg : theme.titleBg};
			border-bottom: 1px solid ${theme.isClassic ? theme.border : theme.panelBorder};
			position: sticky;
			top: 0;
			z-index: 10;
		}

		.inspector-header.type-sprite { border-left: 3px solid #4a9eff; }
		.inspector-header.type-shape { border-left: 3px solid #ff4a4a; }
		.inspector-header.type-text { border-left: 3px solid #ffffff; }
		.inspector-header.type-group { border-left: 3px solid #9b59b6; }
		.inspector-header.scene { border-left: 3px solid #f39c12; }

		.inspector-header-icon {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			width: 20px;
			height: 20px;
			color: ${theme.fg};
			flex-shrink: 0;
		}

		.inspector-header-title {
			flex: 1;
			font-weight: 600;
			font-size: 12px;
			color: ${theme.fg};
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.inspector-header-title-input {
			flex: 1;
			background: transparent;
			border: 1px solid transparent;
			color: ${theme.fg};
			font-family: inherit;
			font-size: 12px;
			font-weight: 600;
			padding: 2px 4px;
			border-radius: 2px;
			outline: none;
			min-width: 0;
		}

		.inspector-header-title-input:hover {
			border-color: ${theme.inputBorder};
		}

		.inspector-header-title-input:focus {
			background: ${theme.inputBg};
			border-color: ${theme.accent};
		}

		.inspector-header-btn {
			background: transparent;
			border: none;
			color: ${theme.fg};
			cursor: pointer;
			padding: 3px;
			border-radius: 2px;
			opacity: 0.6;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
		}

		.inspector-header-btn:hover {
			opacity: 1;
			background: ${theme.isClassic ? theme.bg : "rgba(255,255,255,0.1)"};
		}

		.inspector-header-btn.danger:hover {
			background: rgba(255, 74, 74, 0.2);
			color: #ff4a4a;
		}

		.inspector-id {
			font-family: monospace;
			font-size: 9px;
			opacity: 0.5;
			padding: 2px 8px 4px 8px;
			color: ${theme.fg};
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		/* --- Section --- */
		.inspector-section {
			border-bottom: 1px solid ${theme.isClassic ? theme.border : theme.panelBorder};
		}

		.inspector-section-header {
			display: flex;
			align-items: center;
			gap: 4px;
			padding: 5px 8px;
			cursor: pointer;
			user-select: none;
			background: ${theme.isClassic ? theme.bg : theme.titleBg};
			color: ${theme.fg};
			font-size: 11px;
			font-weight: 600;
			letter-spacing: 0.3px;
		}

		.inspector-section-header:hover {
			background: ${theme.isClassic ? theme.btnHoverBg : "rgba(255,255,255,0.05)"};
		}

		.inspector-section-chevron {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			width: 12px;
			height: 12px;
			opacity: 0.7;
			flex-shrink: 0;
		}

		.inspector-section-icon {
			display: inline-flex;
			align-items: center;
			opacity: 0.7;
		}

		.inspector-section-label {
			flex: 1;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.inspector-section-reset {
			background: transparent;
			border: none;
			color: ${theme.fg};
			cursor: pointer;
			padding: 2px;
			opacity: 0;
			border-radius: 2px;
			display: inline-flex;
			align-items: center;
			justify-content: center;
		}

		.inspector-section-header:hover .inspector-section-reset {
			opacity: 0.6;
		}

		.inspector-section-reset:hover {
			opacity: 1 !important;
			background: ${theme.isClassic ? theme.bg : "rgba(255,255,255,0.1)"};
		}

		.inspector-section-body {
			padding: 6px 8px 8px 8px;
			background: ${theme.isClassic ? theme.bg : "transparent"};
		}

		.inspector-section.collapsed .inspector-section-body {
			display: none;
		}

		/* --- Sub-header --- */
		.inspector-subheader {
			font-size: 10px;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.5px;
			opacity: 0.5;
			margin: 8px 0 4px 0;
			color: ${theme.fg};
		}

		.inspector-subheader:first-child {
			margin-top: 0;
		}

		/* --- Field --- */
		.inspector-field {
			display: flex;
			align-items: center;
			gap: 6px;
			margin-bottom: 4px;
			min-height: 22px;
		}

		.inspector-field.wide {
			display: block;
			margin-bottom: 6px;
		}

		.inspector-field-label {
			font-size: 11px;
			color: ${theme.fg};
			opacity: 0.75;
			flex-shrink: 0;
			min-width: 55px;
			max-width: 55px;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.inspector-field.wide .inspector-field-label {
			display: block;
			min-width: auto;
			max-width: none;
			margin-bottom: 3px;
		}

		.inspector-field-input {
			flex: 1;
			min-width: 0;
			display: flex;
			align-items: center;
			gap: 4px;
		}

		.inspector-field input,
		.inspector-field select,
		.inspector-field textarea {
			width: 100%;
			background: ${theme.inputBg};
			color: ${theme.inputFg};
			border: ${theme.isClassic ? "2px" : "1px"} solid ${theme.isClassic ? theme.inputBorder : theme.inputBorder};
			${theme.isClassic ? `border-color: ${theme.border} ${theme.borderLight} ${theme.borderLight} ${theme.border};` : ""}
			padding: ${theme.isClassic ? "2px 4px" : "3px 6px"};
			border-radius: ${theme.inputRadius};
			font-family: inherit;
			font-size: inherit;
			outline: none;
			box-sizing: border-box;
			min-width: 0;
		}

		.inspector-field input[type="number"] {
			font-variant-numeric: tabular-nums;
		}

		.inspector-field input:focus,
		.inspector-field select:focus,
		.inspector-field textarea:focus {
			border-color: ${theme.accent};
			${theme.isClassic ? `outline: 1px dotted ${theme.fg}; outline-offset: -4px;` : ""}
		}

		.inspector-field-row {
			display: flex;
			gap: 8px;
			margin-bottom: 4px;
		}

		.inspector-field-row .inspector-field {
			flex: 1;
			margin-bottom: 0;
			min-width: 0;
		}

		.inspector-field-row .inspector-field-label {
			min-width: 20px;
			max-width: 20px;
		}

		/* --- Color row --- */
		.inspector-color-row {
			display: flex;
			gap: 4px;
			align-items: center;
		}

		.inspector-color-row input[type="color"] {
			width: 32px;
			height: 22px;
			padding: 1px;
			border: 1px solid ${theme.inputBorder};
			border-radius: ${theme.inputRadius};
			background: ${theme.inputBg};
			cursor: pointer;
			flex-shrink: 0;
		}

		.inspector-color-row input[type="text"] {
			flex: 1;
			font-family: monospace;
			font-size: 10px;
			min-width: 0;
		}

		/* --- Checkbox --- */
		.inspector-checkbox-row {
			display: flex;
			gap: 6px;
			align-items: center;
			cursor: pointer;
			font-size: 11px;
			color: ${theme.fg};
		}

		.inspector-checkbox-row input[type="checkbox"] {
			width: 13px;
			height: 13px;
			min-height: 13px;
			appearance: none;
			-webkit-appearance: none;
			background: ${theme.inputBg};
			border: 1px solid ${theme.inputBorder};
			border-radius: ${theme.isClassic ? "0" : "2px"};
			position: relative;
			cursor: pointer;
			flex-shrink: 0;
		}

		.inspector-checkbox-row input[type="checkbox"]:checked {
			${theme.isClassic ? "" : `background: ${theme.accent}; border-color: ${theme.accent};`}
		}

		.inspector-checkbox-row input[type="checkbox"]:checked::after {
			content: "✓";
			position: absolute;
			left: ${theme.isClassic ? "0" : "1px"};
			top: ${theme.isClassic ? "-3px" : "-2px"};
			font-size: ${theme.isClassic ? "13px" : "12px"};
			font-weight: bold;
			color: ${theme.isClassic ? theme.fg : theme.accentFg};
		}

		/* --- Texture row --- */
		.inspector-texture-row {
			display: flex;
			gap: 6px;
			align-items: center;
			background: ${theme.inputBg};
			padding: 3px 6px;
			border: 1px solid ${theme.inputBorder};
			border-radius: ${theme.inputRadius};
			font-family: monospace;
			font-size: 10px;
			color: ${theme.fg};
			overflow: hidden;
		}

		.inspector-texture-icon {
			flex-shrink: 0;
		}

		.inspector-texture-path {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			flex: 1;
			min-width: 0;
		}

		/* --- Layer buttons --- */
		.inspector-layer-buttons {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 4px;
			margin-top: 6px;
		}

		.inspector-layer-btn {
			padding: 4px 6px;
			background: ${theme.btnBg};
			color: ${theme.btnFg};
			border: ${theme.isClassic ? "2px" : "1px"} solid ${theme.btnBorder};
			${theme.isClassic ? `border-color: ${theme.borderLight} ${theme.borderDark} ${theme.borderDark} ${theme.borderLight};` : ""}
			border-radius: ${theme.btnRadius};
			cursor: pointer;
			font-family: inherit;
			font-size: 10px;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.inspector-layer-btn:hover {
			background: ${theme.btnHoverBg};
		}

		.inspector-layer-btn:active {
			${theme.isClassic ? `border-color: ${theme.borderDark} ${theme.borderLight} ${theme.borderLight} ${theme.borderDark};` : ""}
		}

		/* --- Properties JSON --- */
		.inspector-properties-json {
			width: 100%;
			font-family: "Courier New", monospace !important;
			font-size: 10px !important;
			resize: vertical;
			min-height: 60px;
			background: ${theme.inputBg};
			color: ${theme.inputFg};
			border: 1px solid ${theme.inputBorder};
			border-radius: ${theme.inputRadius};
			padding: 4px 6px;
			outline: none;
			box-sizing: border-box;
		}

		/* --- Empty state --- */
		.inspector-empty {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			padding: 40px 20px;
			text-align: center;
			color: ${theme.fg};
			height: 100%;
			box-sizing: border-box;
		}

		.inspector-empty-icon {
			font-size: 36px;
			opacity: 0.3;
			margin-bottom: 12px;
		}

		.inspector-empty-title {
			font-size: 12px;
			font-weight: 600;
			margin-bottom: 6px;
			opacity: 0.7;
		}

		.inspector-empty-hint {
			font-size: 11px;
			opacity: 0.5;
			line-height: 1.5;
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

export function applyThemeCss(theme: Theme): void {
	let styleEl = document.getElementById("viewport-theme") as HTMLStyleElement | null;
	if (!styleEl) {
		styleEl = document.createElement("style");
		styleEl.id = "viewport-theme";
		document.head.appendChild(styleEl);
	}
	styleEl.textContent = buildThemeCss(theme);
	document.documentElement.style.colorScheme = theme.name === "win98" ? "light" : "dark";
}

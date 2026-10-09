// src/webview/inspector/theme-style.ts
import type { Theme } from "./theme-types.js";

export function buildInspectorCss(theme: Theme): string {
	return `
		* { box-sizing: border-box; }
		html, body, #app {
			margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; user-select: none;
			background: ${theme.isClassic ? theme.bg : theme.panelBg};
			color: ${theme.fg};
			font-family: ${theme.fontFamily};
			font-size: ${theme.fontSize};
			font-weight: ${theme.fontWeight};
		}
		#app { overflow-y: auto; overflow-x: hidden; }

		.inspector {
			padding: 0;
			background: ${theme.isClassic ? theme.bg : theme.panelBg};
			color: ${theme.fg};
			display: flex;
			flex-direction: column;
			font-size: 11px;
		}

		.inspector-header {
			display: flex; align-items: center; gap: 6px;
			padding: 6px 8px;
			background: ${theme.isClassic ? theme.bg : theme.titleBg};
			border-bottom: 1px solid ${theme.isClassic ? theme.border : theme.panelBorder};
			position: sticky; top: 0; z-index: 10;
		}
		.inspector-header.type-gameobject { border-left: 3px solid #9b59b6; }
		.inspector-header.type-sprite { border-left: 3px solid #4a9eff; }
		.inspector-header.type-shape { border-left: 3px solid #ff4a4a; }
		.inspector-header.type-text { border-left: 3px solid #ffffff; }
		.inspector-header.type-group { border-left: 3px solid #9b59b6; }
		.inspector-header.scene { border-left: 3px solid #f39c12; }

		.inspector-header-icon { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; color: ${theme.fg}; flex-shrink: 0; }
		.inspector-header-title { flex: 1; font-weight: 600; font-size: 12px; color: ${theme.fg}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
		.inspector-header-title-input {
			flex: 1; background: transparent; border: 1px solid transparent; color: ${theme.fg};
			font-family: inherit; font-size: 12px; font-weight: 600; padding: 2px 4px; border-radius: 2px; outline: none; min-width: 0;
		}
		.inspector-header-title-input:hover { border-color: ${theme.inputBorder}; }
		.inspector-header-title-input:focus { background: ${theme.inputBg}; border-color: ${theme.accent}; }
		.inspector-header-btn {
			background: transparent; border: none; color: ${theme.fg}; cursor: pointer; padding: 3px;
			border-radius: 2px; opacity: 0.6; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
		}
		.inspector-header-btn:hover { opacity: 1; background: ${theme.isClassic ? theme.bg : "rgba(255,255,255,0.1)"}; }
		.inspector-header-btn.danger:hover { background: rgba(255,74,74,0.2); color: #ff4a4a; }
		.inspector-id { font-family: monospace; font-size: 9px; opacity: 0.5; padding: 2px 8px 4px 8px; color: ${theme.fg}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

		.inspector-section { border-bottom: 1px solid ${theme.isClassic ? theme.border : theme.panelBorder}; }
		.inspector-section-header {
			display: flex; align-items: center; gap: 4px; padding: 5px 8px; cursor: pointer; user-select: none;
			background: ${theme.isClassic ? theme.bg : theme.titleBg}; color: ${theme.fg};
			font-size: 11px; font-weight: 600; letter-spacing: 0.3px;
		}
		.inspector-section-header:hover { background: ${theme.isClassic ? theme.btnHoverBg : "rgba(255,255,255,0.05)"}; }
		.inspector-section-chevron { display: inline-flex; align-items: center; justify-content: center; width: 12px; height: 12px; opacity: 0.7; flex-shrink: 0; }
		.inspector-section-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
		.inspector-section-reset {
			background: transparent; border: none; color: ${theme.fg}; cursor: pointer; padding: 2px; opacity: 0;
			border-radius: 2px; display: inline-flex; align-items: center; justify-content: center;
		}
		.inspector-section-header:hover .inspector-section-reset { opacity: 0.6; }
		.inspector-section-reset:hover { opacity: 1 !important; background: ${theme.isClassic ? theme.bg : "rgba(255,255,255,0.1)"}; }
		.inspector-section-body { padding: 6px 8px 8px 8px; background: ${theme.isClassic ? theme.bg : "transparent"}; }
		.inspector-section.collapsed .inspector-section-body { display: none; }

		.inspector-subheader { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.5; margin: 8px 0 4px 0; color: ${theme.fg}; }
		.inspector-subheader:first-child { margin-top: 0; }

		.inspector-field { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; min-height: 22px; }
		.inspector-field.wide { display: block; margin-bottom: 6px; }
		.inspector-field-label { font-size: 11px; color: ${theme.fg}; opacity: 0.75; flex-shrink: 0; min-width: 55px; max-width: 55px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
		.inspector-field.wide .inspector-field-label { display: block; min-width: auto; max-width: none; margin-bottom: 3px; }
		.inspector-field-input { flex: 1; min-width: 0; display: flex; align-items: center; gap: 4px; }
		.inspector-field input, .inspector-field select, .inspector-field textarea {
			width: 100%; background: ${theme.inputBg}; color: ${theme.inputFg};
			border: ${theme.isClassic ? "2px" : "1px"} solid ${theme.inputBorder};
			${theme.isClassic ? `border-color: ${theme.border} ${theme.borderLight} ${theme.borderLight} ${theme.border};` : ""}
			padding: ${theme.isClassic ? "2px 4px" : "3px 6px"};
			border-radius: ${theme.inputRadius}; font-family: inherit; font-size: inherit; outline: none; box-sizing: border-box; min-width: 0;
		}
		.inspector-field input:focus, .inspector-field select:focus, .inspector-field textarea:focus {
			border-color: ${theme.accent};
			${theme.isClassic ? `outline: 1px dotted ${theme.fg}; outline-offset: -4px;` : ""}
		}
		.inspector-field-row { display: flex; gap: 8px; margin-bottom: 4px; }
		.inspector-field-row .inspector-field { flex: 1; margin-bottom: 0; min-width: 0; }
		.inspector-field-row .inspector-field-label { min-width: 20px; max-width: 20px; }

		.inspector-color-row { display: flex; gap: 4px; align-items: center; }
		.inspector-color-row input[type="color"] { width: 32px; height: 22px; padding: 1px; border: 1px solid ${theme.inputBorder}; border-radius: ${theme.inputRadius}; background: ${theme.inputBg}; cursor: pointer; flex-shrink: 0; }
		.inspector-color-row input[type="text"] { flex: 1; font-family: monospace; font-size: 10px; min-width: 0; }

		.inspector-checkbox-row { display: flex; gap: 6px; align-items: center; cursor: pointer; font-size: 11px; color: ${theme.fg}; }
		.inspector-checkbox-row input[type="checkbox"] {
			width: 13px; height: 13px; min-height: 13px; appearance: none; -webkit-appearance: none;
			background: ${theme.inputBg}; border: 1px solid ${theme.inputBorder};
			border-radius: ${theme.isClassic ? "0" : "2px"}; position: relative; cursor: pointer; flex-shrink: 0;
		}
		.inspector-checkbox-row input[type="checkbox"]:checked { ${theme.isClassic ? "" : `background: ${theme.accent}; border-color: ${theme.accent};`} }
		.inspector-checkbox-row input[type="checkbox"]:checked::after {
			content: "✓"; position: absolute;
			left: ${theme.isClassic ? "0" : "1px"}; top: ${theme.isClassic ? "-3px" : "-2px"};
			font-size: ${theme.isClassic ? "13px" : "12px"}; font-weight: bold;
			color: ${theme.isClassic ? theme.fg : theme.accentFg};
		}

		.inspector-texture-row { display: flex; gap: 6px; align-items: center; background: ${theme.inputBg}; padding: 3px 6px; border: 1px solid ${theme.inputBorder}; border-radius: ${theme.inputRadius}; font-family: monospace; font-size: 10px; color: ${theme.fg}; overflow: hidden; }
		.inspector-texture-icon { flex-shrink: 0; }
		.inspector-texture-path { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0; }

		.inspector-layer-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 6px; }
		.inspector-layer-btn {
			padding: 4px 6px; background: ${theme.btnBg}; color: ${theme.btnFg};
			border: ${theme.isClassic ? "2px" : "1px"} solid ${theme.btnBorder};
			${theme.isClassic ? `border-color: ${theme.borderLight} ${theme.borderDark} ${theme.borderDark} ${theme.borderLight};` : ""}
			border-radius: ${theme.btnRadius}; cursor: pointer; font-family: inherit; font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
		}
		.inspector-layer-btn:hover { background: ${theme.btnHoverBg}; }

		.inspector-properties-json {
			width: 100%; font-family: "Courier New", monospace !important; font-size: 10px !important;
			resize: vertical; min-height: 60px; background: ${theme.inputBg}; color: ${theme.inputFg};
			border: 1px solid ${theme.inputBorder}; border-radius: ${theme.inputRadius}; padding: 4px 6px; outline: none; box-sizing: border-box;
		}

		.inspector-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; text-align: center; color: ${theme.fg}; height: 100%; box-sizing: border-box; }
		.inspector-empty-icon { font-size: 36px; opacity: 0.3; margin-bottom: 12px; }
		.inspector-empty-title { font-size: 12px; font-weight: 600; margin-bottom: 6px; opacity: 0.7; }
		.inspector-empty-hint { font-size: 11px; opacity: 0.5; line-height: 1.5; }

		.inspector-number-wrap { position: relative; display: flex; align-items: center; width: 100%; }
		.inspector-number-wrap input { padding-left: 18px !important; width: 100%; }
		.inspector-drag-handle {
			position: absolute; left: 0; top: 0; bottom: 0; width: 14px; cursor: ew-resize;
			display: flex; align-items: center; justify-content: center; color: ${theme.fg};
			opacity: 0.35; user-select: none; z-index: 1;
			border-radius: ${theme.inputRadius} 0 0 ${theme.inputRadius};
		}
		.inspector-drag-handle:hover { opacity: 0.8; background: ${theme.isClassic ? theme.bg : "rgba(255,255,255,0.05)"}; }
		.inspector-drag-handle svg { pointer-events: none; }

		.inspector-components-empty { font-size: 11px; opacity: 0.5; font-style: italic; padding: 6px 4px; color: ${theme.fg}; text-align: center; }
		.inspector-component-add-wrap { position: relative; margin-top: 6px; }
		.inspector-component-add-btn {
			display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; padding: 5px 8px;
			background: ${theme.isClassic ? theme.btnBg : "transparent"}; color: ${theme.fg};
			border: ${theme.isClassic ? "2px" : "1px"} dashed ${theme.border};
			${theme.isClassic ? `border-color: ${theme.borderLight} ${theme.borderDark} ${theme.borderDark} ${theme.borderLight};` : ""}
			border-radius: ${theme.btnRadius}; cursor: pointer; font-family: inherit; font-size: 11px; opacity: 0.75;
		}
		.inspector-component-add-btn:hover { opacity: 1; background: ${theme.btnHoverBg}; }
		.inspector-component-add-btn svg { display: block; flex-shrink: 0; }
		.inspector-component-add-menu {
			display: none; position: absolute; top: calc(100% + 2px); left: 0; right: 0;
			background: ${theme.menuBg}; color: ${theme.menuFg};
			border: ${theme.isClassic ? "2px" : "1px"} solid ${theme.menuBorder};
			${theme.isClassic ? `border-color: ${theme.borderLight} ${theme.borderDark} ${theme.borderDark} ${theme.borderLight};` : ""}
			border-radius: ${theme.menuRadius}; box-shadow: ${theme.menuShadow}; padding: 3px 0; z-index: 300; max-height: 240px; overflow-y: auto;
		}
		.inspector-component-add-menu.open { display: block; }
		.inspector-component-add-item {
			display: flex; align-items: center; gap: 8px; padding: 5px 10px; cursor: pointer;
			font-size: 11px; font-family: inherit; color: ${theme.menuFg}; white-space: nowrap;
		}
		.inspector-component-add-item:hover { background: ${theme.menuHoverBg}; color: ${theme.menuHoverFg}; }

		.inspector-component-card {
			background: ${theme.isClassic ? theme.bg : "rgba(255,255,255,0.025)"};
			border: 1px solid ${theme.isClassic ? theme.border : theme.panelBorder};
			${theme.isClassic ? `border-color: ${theme.borderLight} ${theme.borderDark} ${theme.borderDark} ${theme.borderLight};` : ""}
			border-radius: ${theme.isClassic ? "0" : "3px"}; margin-bottom: 6px; overflow: hidden;
		}
		.inspector-component-header {
			display: flex; align-items: center; gap: 6px; padding: 4px 6px;
			background: ${theme.isClassic ? theme.bg : theme.titleBg};
			border-bottom: 1px solid ${theme.isClassic ? theme.border : theme.panelBorder};
			cursor: default; user-select: none;
		}
		.inspector-component-icon { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; font-size: 12px; flex-shrink: 0; }
		.inspector-component-label { flex: 1; font-size: 11px; font-weight: 600; color: ${theme.fg}; letter-spacing: 0.2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
		.inspector-component-remove {
			display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; padding: 0;
			background: transparent; border: none; color: ${theme.fg}; cursor: pointer; opacity: 0.4; border-radius: 2px; flex-shrink: 0;
		}
		.inspector-component-remove:hover { opacity: 1; background: rgba(255,74,74,0.2); color: #ff4a4a; }
		.inspector-component-remove svg { display: block; }
		.inspector-component-body { padding: 6px 6px 4px 6px; }
		.inspector-frames-textarea {
			width: 100%; font-family: "Courier New", monospace !important; font-size: 10px !important;
			resize: vertical; min-height: 44px; background: ${theme.inputBg}; color: ${theme.inputFg};
			border: 1px solid ${theme.inputBorder}; border-radius: ${theme.inputRadius}; padding: 4px 6px; outline: none; box-sizing: border-box;
		}
		.inspector-component-hint { font-size: 10px; opacity: 0.55; font-style: italic; padding: 2px 0; color: ${theme.fg}; }
		.inspector-component-reload {
			display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; padding: 0;
			background: ${theme.btnBg}; color: ${theme.btnFg};
			border: ${theme.isClassic ? "2px" : "1px"} solid ${theme.btnBorder};
			${theme.isClassic ? `border-color: ${theme.borderLight} ${theme.borderDark} ${theme.borderDark} ${theme.borderLight};` : ""}
			border-radius: ${theme.btnRadius}; cursor: pointer; font-size: 11px; flex-shrink: 0;
		}
		.inspector-component-reload:hover { background: ${theme.btnHoverBg}; }

		#app::-webkit-scrollbar { width: 16px; height: 16px; }
		#app::-webkit-scrollbar-track { background: ${theme.scrollTrack}; }
		#app::-webkit-scrollbar-thumb {
			background: ${theme.scrollThumb};
			border: ${theme.isClassic ? `2px solid; border-color: ${theme.borderLight} ${theme.borderDark} ${theme.borderDark} ${theme.borderLight};` : `1px solid ${theme.scrollThumbBorder}; border-radius: 5px;`};
		}

		.inspector-readonly-field {
			display: flex;
			align-items: center;
			gap: 8px;
			padding: 3px 4px;
			margin-bottom: 2px;
			font-size: 11px;
		}

		.inspector-readonly-label {
			flex-shrink: 0;
			min-width: 70px;
			max-width: 70px;
			opacity: 0.65;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.inspector-readonly-value {
			flex: 1;
			min-width: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			font-family: monospace;
			font-size: 10px;
			opacity: 0.9;
			display: flex;
			align-items: center;
			gap: 6px;
		}

		.inspector-color-swatch {
			display: inline-block;
			width: 12px;
			height: 12px;
			border: 1px solid ${theme.isClassic ? theme.borderDark : theme.panelBorder};
			border-radius: 2px;
			flex-shrink: 0;
		}

		.inspector-section-remove {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			width: 18px;
			height: 18px;
			padding: 0;
			background: transparent;
			border: none;
			color: ${theme.fg};
			cursor: pointer;
			opacity: 0.4;
			border-radius: 2px;
			flex-shrink: 0;
		}

		.inspector-section-remove:hover {
			opacity: 1;
			background: rgba(255, 74, 74, 0.2);
			color: #ff4a4a;
		}

		/* ============ Atlas ============ */

		.inspector-hint {
			font-size: 10px;
			opacity: 0.6;
			font-style: italic;
			padding: 2px 0;
			color: ${theme.fg};
			line-height: 1.4;
		}

		.inspector-atlas-footer {
			display: flex;
			justify-content: flex-end;
			margin-top: 8px;
			gap: 6px;
			flex-wrap: wrap;
		}

		.inspector-atlas-btn {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			gap: 4px;
			padding: 4px 10px;
			background: ${theme.btnBg};
			color: ${theme.btnFg};
			border: ${theme.isClassic ? "2px" : "1px"} solid ${theme.btnBorder};
			${theme.isClassic ? `border-color: ${theme.borderLight} ${theme.borderDark} ${theme.borderDark} ${theme.borderLight};` : ""}
			border-radius: ${theme.btnRadius};
			cursor: pointer;
			font-family: inherit;
			font-size: 11px;
			margin-top: 4px;
		}

		.inspector-atlas-btn:hover {
			background: ${theme.btnHoverBg};
		}

		.inspector-atlas-btn:active {
			${theme.isClassic ? `border-color: ${theme.borderDark} ${theme.borderLight} ${theme.borderLight} ${theme.borderDark};` : ""}
		}

		.inspector-atlas-btn.danger {
			color: #ff7070;
		}

		.inspector-atlas-btn.danger:hover {
			background: rgba(255, 74, 74, 0.15);
		}

		/* 🆕 Assets section */
		.inspector-asset-row {
			display: flex;
			gap: 4px;
			align-items: stretch;
		}

		.inspector-asset-row input[data-assets-path] {
			flex: 1;
			min-width: 0;
			background: ${theme.inputBg};
			color: ${theme.inputFg};
			border: 1px solid ${theme.inputBorder};
			border-radius: ${theme.inputRadius};
			padding: 3px 6px;
			font-family: monospace;
			font-size: 10px;
			outline: none;
		}

		.inspector-asset-btn {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			gap: 4px;
			padding: 4px 10px;
			background: ${theme.btnBg};
			color: ${theme.btnFg};
			border: ${theme.isClassic ? "2px" : "1px"} solid ${theme.btnBorder};
			${theme.isClassic ? `border-color: ${theme.borderLight} ${theme.borderDark} ${theme.borderDark} ${theme.borderLight};` : ""}
			border-radius: ${theme.btnRadius};
			cursor: pointer;
			font-family: inherit;
			font-size: 11px;
			flex-shrink: 0;
		}

		.inspector-asset-btn:hover {
			background: ${theme.btnHoverBg};
		}

		.inspector-hint code {
			background: ${theme.isClassic ? "#fff" : "rgba(0,0,0,0.3)"};
			padding: 1px 4px;
			border-radius: 2px;
			font-family: monospace;
			font-size: 10px;
		}

		.inspector-frames-textarea {
			width: 100%;
			font-family: "Courier New", monospace !important;
			font-size: 10px !important;
			resize: vertical;
			min-height: 60px;
			background: ${theme.inputBg};
			color: ${theme.inputFg};
			border: ${theme.isClassic ? "2px" : "1px"} solid ${theme.inputBorder};
			${theme.isClassic ? `border-color: ${theme.border} ${theme.borderLight} ${theme.borderLight} ${theme.border};` : ""}
			border-radius: ${theme.inputRadius};
			padding: 4px 6px;
			outline: none;
			box-sizing: border-box;
		}

		.inspector-frames-textarea:focus {
			border-color: ${theme.accent};
		}

		/* --- Atlas preview grid --- */
		.atlas-preview-grid {
			display: flex;
			flex-wrap: wrap;
			gap: 3px;
			padding: 6px;
			background: ${theme.isClassic ? theme.bg : "rgba(0,0,0,0.15)"};
			border: 1px solid ${theme.isClassic ? theme.border : theme.panelBorder};
			border-radius: ${theme.inputRadius};
			min-height: 48px;
			align-items: center;
			justify-content: flex-start;
		}

		.atlas-preview-cell {
			image-rendering: pixelated;
			image-rendering: -moz-crisp-edges;
			image-rendering: crisp-edges;
			border: 1px solid ${theme.isClassic ? theme.borderDark : "rgba(255,255,255,0.15)"};
			border-radius: 2px;
			background-color: ${theme.isClassic ? "#ffffff" : "rgba(255,255,255,0.05)"};
			flex-shrink: 0;
		}

		.atlas-preview-more {
			font-size: 10px;
			opacity: 0.6;
			font-style: italic;
			padding: 0 4px;
			align-self: center;
		}

		.atlas-preview-meta {
			display: flex;
			justify-content: space-between;
			font-size: 10px;
			opacity: 0.6;
			margin-top: 4px;
			font-family: monospace;
		}

		.atlas-preview-dims {
			opacity: 0.8;
		}
	`;
}

export function applyInspectorTheme(theme: Theme): void {
	let styleEl = document.getElementById("inspector-theme") as HTMLStyleElement | null;
	if (!styleEl) {
		styleEl = document.createElement("style");
		styleEl.id = "inspector-theme";
		document.head.appendChild(styleEl);
	}
	styleEl.textContent = buildInspectorCss(theme);
	document.documentElement.style.colorScheme = theme.name === "win98" ? "light" : "dark";
}

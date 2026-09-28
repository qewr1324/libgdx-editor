import * as vscode from "vscode";

export type WebviewKind = "viewport" | "inspector";

export function getWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri, kind: WebviewKind): string {
	const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "dist", "webview", `${kind}.js`));
	const nonce = getNonce();

	const win98Css = `
		/* ========== Windows 98 Theme ========== */
		:root {
			--win-bg: #c0c0c0;
			--win-bg-dark: #808080;
			--win-bg-light: #dfdfdf;
			--win-bg-white: #ffffff;
			--win-text: #000000;
			--win-text-disabled: #808080;
			--win-title-active: #000080;
			--win-title-active-text: #ffffff;
			--win-title-inactive: #808080;
			--win-title-inactive-text: #c0c0c0;
			--win-highlight: #000080;
			--win-highlight-text: #ffffff;
			--win-shadow: #000000;
			--win-border-light: #ffffff;
			--win-border-dark: #808080;
			--win-border-darker: #404040;
			--win-field-bg: #ffffff;
			--win-field-text: #000000;
		}

		* {
			box-sizing: border-box;
		}

		html, body, #app {
			margin: 0;
			padding: 0;
			width: 100%;
			height: 100%;
			overflow: hidden;
			background: var(--win-bg);
			color: var(--win-text);
			font-family: "Tahoma", "MS Sans Serif", "Segoe UI", sans-serif;
			font-size: 11px;
			-webkit-font-smoothing: none;
			font-smooth: never;
			user-select: none;
		}

		canvas {
			display: block;
		}

		/* ========== Classic 3D borders ========== */
		.win-raised {
			border: 2px solid;
			border-color: var(--win-border-light) var(--win-border-darker) var(--win-border-darker) var(--win-border-light);
			box-shadow: inset -1px -1px 0 var(--win-border-dark), inset 1px 1px 0 var(--win-bg-light);
		}

		.win-sunken {
			border: 2px solid;
			border-color: var(--win-border-dark) var(--win-border-light) var(--win-border-light) var(--win-border-dark);
			box-shadow: inset 1px 1px 0 var(--win-border-darker), inset -1px -1px 0 var(--win-bg-light);
		}

		.win-groove {
			border: 2px solid;
			border-color: var(--win-border-dark) var(--win-border-light) var(--win-border-light) var(--win-border-dark);
		}

		/* ========== Rulers ========== */
		#ruler-h, #ruler-v {
			display: block;
			background: var(--win-bg);
			user-select: none;
		}
		#ruler-h {
			border-bottom: 2px solid;
			border-color: var(--win-border-light);
			box-shadow: 0 1px 0 var(--win-border-dark);
		}
		#ruler-v {
			border-right: 2px solid;
			border-color: var(--win-border-light);
			box-shadow: 1px 0 0 var(--win-border-dark);
		}
		#ruler-info {
			user-select: none;
		}

		/* ========== Toolbar ========== */
		#toolbar {
			position: fixed;
			z-index: 100;
			display: flex;
			gap: 2px;
			padding: 3px;
			background: var(--win-bg);
			border: 2px solid;
			border-color: var(--win-border-light) var(--win-border-darker) var(--win-border-darker) var(--win-border-light);
			box-shadow: inset -1px -1px 0 var(--win-border-dark), inset 1px 1px 0 var(--win-bg-light);
			align-items: center;
			font-size: 11px;
			font-family: "Tahoma", "MS Sans Serif", sans-serif;
		}

		#toolbar button {
			background: var(--win-bg);
			color: var(--win-text);
			border: 2px solid;
			border-color: var(--win-border-light) var(--win-border-darker) var(--win-border-darker) var(--win-border-light);
			box-shadow: inset -1px -1px 0 var(--win-border-dark), inset 1px 1px 0 var(--win-bg-light);
			padding: 3px 10px;
			min-height: 22px;
			cursor: pointer;
			font-family: inherit;
			font-size: 11px;
			font-weight: normal;
			color: var(--win-text);
		}

		#toolbar button:hover {
			background: var(--win-bg);
		}

		#toolbar button:active,
		#toolbar button.active {
			border-color: var(--win-border-darker) var(--win-border-light) var(--win-border-light) var(--win-border-darker);
			box-shadow: inset 1px 1px 0 var(--win-border-dark);
			padding: 4px 9px 2px 11px;
		}

		#toolbar button:focus {
			outline: 1px dotted var(--win-text);
			outline-offset: -4px;
		}

		#toolbar-info {
			margin-left: 8px;
			padding: 2px 8px;
			color: var(--win-text);
			font-size: 11px;
			font-family: "Tahoma", "MS Sans Serif", sans-serif;
			background: var(--win-bg);
			border: 2px solid;
			border-color: var(--win-border-dark) var(--win-border-light) var(--win-border-light) var(--win-border-dark);
			box-shadow: inset 1px 1px 0 var(--win-border-darker);
			min-height: 20px;
			line-height: 16px;
		}
		#toolbar-info:empty {
			display: none;
		}

		/* ========== Context Menu ========== */
		#context-menu {
			position: fixed;
			z-index: 1000;
			background: var(--win-bg);
			color: var(--win-text);
			border: 2px solid;
			border-color: var(--win-border-light) var(--win-border-darker) var(--win-border-darker) var(--win-border-light);
			box-shadow: inset -1px -1px 0 var(--win-border-dark), inset 1px 1px 0 var(--win-bg-light), 2px 2px 4px rgba(0,0,0,0.4);
			padding: 2px;
			min-width: 180px;
			font-family: "Tahoma", "MS Sans Serif", sans-serif;
			font-size: 11px;
		}

		.context-menu-item {
			padding: 3px 20px 3px 24px;
			cursor: pointer;
			display: flex;
			align-items: center;
			gap: 6px;
			color: var(--win-text);
			position: relative;
			white-space: nowrap;
		}

		.context-menu-item:hover {
			background: var(--win-highlight);
			color: var(--win-highlight-text);
		}

		.context-menu-separator {
			height: 2px;
			background: var(--win-bg);
			border-top: 1px solid var(--win-border-dark);
			border-bottom: 1px solid var(--win-border-light);
			margin: 2px 0;
		}

		/* ========== Inspector panels ========== */
		#app { overflow-y: auto; }

		/* Scrollbar Windows 98 style */
		#app::-webkit-scrollbar,
		body::-webkit-scrollbar {
			width: 16px;
			height: 16px;
		}
		#app::-webkit-scrollbar-track,
		body::-webkit-scrollbar-track {
			background: #dfdfdf;
			background-image:
				linear-gradient(45deg, #ffffff 25%, transparent 25%),
				linear-gradient(-45deg, #ffffff 25%, transparent 25%),
				linear-gradient(45deg, transparent 75%, #ffffff 75%),
				linear-gradient(-45deg, transparent 75%, #ffffff 75%);
			background-size: 4px 4px;
			background-position: 0 0, 0 2px, 2px -2px, -2px 0px;
		}
		#app::-webkit-scrollbar-thumb,
		body::-webkit-scrollbar-thumb {
			background: var(--win-bg);
			border: 2px solid;
			border-color: var(--win-border-light) var(--win-border-darker) var(--win-border-darker) var(--win-border-light);
			box-shadow: inset -1px -1px 0 var(--win-border-dark), inset 1px 1px 0 var(--win-bg-light);
		}

		.empty-state {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			height: 100%;
			padding: 20px;
			text-align: center;
			color: var(--win-text);
			background: var(--win-bg);
		}
		.empty-icon { font-size: 48px; opacity: 0.4; margin-bottom: 12px; }
		.empty-text { font-size: 12px; font-weight: bold; margin-bottom: 6px; }
		.empty-hint { font-size: 11px; opacity: 0.7; line-height: 1.5; }

		.inspector { padding: 4px; }

		/* Sections = GroupBox Win98 */
		.section {
			margin-bottom: 10px;
			padding: 14px 8px 8px 8px;
			background: var(--win-bg);
			border: 2px solid;
			border-color: var(--win-border-dark) var(--win-border-light) var(--win-border-light) var(--win-border-dark);
			box-shadow: inset 1px 1px 0 var(--win-border-darker);
			position: relative;
		}

		.section-title {
			position: absolute;
			top: -8px;
			left: 8px;
			padding: 0 4px;
			background: var(--win-bg);
			font-size: 11px;
			font-weight: bold;
			color: var(--win-text);
			text-transform: none;
			letter-spacing: 0;
		}

		.header-section {
			padding: 6px;
			background: linear-gradient(90deg, var(--win-title-active), #1084d0);
			border: 2px solid;
			border-color: var(--win-border-light) var(--win-border-darker) var(--win-border-darker) var(--win-border-light);
			box-shadow: inset -1px -1px 0 var(--win-border-dark), inset 1px 1px 0 var(--win-bg-light);
		}

		.header-top {
			display: flex;
			gap: 6px;
			align-items: center;
			margin-bottom: 4px;
		}

		.header-section .object-id {
			color: var(--win-title-active-text);
		}

		.object-type-badge {
			font-size: 11px;
			padding: 1px 8px;
			background: var(--win-bg);
			color: var(--win-text);
			border: 2px solid;
			border-color: var(--win-border-light) var(--win-border-darker) var(--win-border-darker) var(--win-border-light);
			box-shadow: inset -1px -1px 0 var(--win-border-dark), inset 1px 1px 0 var(--win-bg-light);
			text-transform: uppercase;
			font-weight: bold;
			font-family: "Tahoma", "MS Sans Serif", sans-serif;
		}

		.type-sprite { background: #000080; color: #ffffff; }
		.type-shape { background: #800000; color: #ffffff; }
		.type-text { background: #ffffff; color: #000000; }
		.type-group { background: #800080; color: #ffffff; }
		.type-scene { background: #000080; color: #ffffff; }

		.object-id {
			font-size: 11px;
			color: var(--win-text);
			font-family: "Tahoma", "MS Sans Serif", sans-serif;
			word-break: break-all;
		}

		.btn-icon {
			background: var(--win-bg);
			border: 2px solid;
			border-color: var(--win-border-light) var(--win-border-darker) var(--win-border-darker) var(--win-border-light);
			box-shadow: inset -1px -1px 0 var(--win-border-dark), inset 1px 1px 0 var(--win-bg-light);
			cursor: pointer;
			font-size: 11px;
			padding: 2px 6px;
			min-width: 24px;
			min-height: 22px;
			color: var(--win-text);
			margin-left: auto;
		}
		.btn-icon:hover { background: var(--win-bg); }
		.btn-icon:active {
			border-color: var(--win-border-darker) var(--win-border-light) var(--win-border-light) var(--win-border-darker);
			box-shadow: inset 1px 1px 0 var(--win-border-dark);
			padding: 3px 5px 1px 7px;
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
			color: var(--win-text);
			text-transform: none;
			letter-spacing: 0;
			font-weight: normal;
		}

		.field input,
		.field select,
		.field textarea {
			background: var(--win-field-bg);
			color: var(--win-field-text);
			border: 2px solid;
			border-color: var(--win-border-dark) var(--win-border-light) var(--win-border-light) var(--win-border-dark);
			box-shadow: inset 1px 1px 0 var(--win-border-darker);
			padding: 2px 4px;
			font-family: "Tahoma", "MS Sans Serif", sans-serif;
			font-size: 11px;
			width: 100%;
			min-height: 20px;
			outline: none;
		}

		.field input:focus,
		.field select:focus,
		.field textarea:focus {
			outline: 1px dotted var(--win-text);
			outline-offset: -4px;
			border-color: var(--win-border-dark) var(--win-border-light) var(--win-border-light) var(--win-border-dark);
		}

		.field select {
			padding: 1px 2px;
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
			border: 2px solid;
			border-color: var(--win-border-dark) var(--win-border-light) var(--win-border-light) var(--win-border-dark);
			box-shadow: inset 1px 1px 0 var(--win-border-darker);
			background: var(--win-bg);
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
			width: auto;
			appearance: none;
			-webkit-appearance: none;
			width: 13px;
			height: 13px;
			min-height: 13px;
			background: var(--win-field-bg);
			border: 2px solid;
			border-color: var(--win-border-dark) var(--win-border-light) var(--win-border-light) var(--win-border-dark);
			box-shadow: inset 1px 1px 0 var(--win-border-darker);
			position: relative;
			cursor: pointer;
		}

		.checkbox-row input[type="checkbox"]:checked::after {
			content: "✓";
			position: absolute;
			left: 0;
			top: -3px;
			font-size: 13px;
			font-weight: bold;
			color: var(--win-text);
		}

		.texture-row {
			display: flex;
			gap: 6px;
			align-items: center;
			font-family: "Tahoma", "MS Sans Serif", sans-serif;
			font-size: 11px;
			color: var(--win-text);
			word-break: break-all;
			background: var(--win-field-bg);
			padding: 3px 6px;
			border: 2px solid;
			border-color: var(--win-border-dark) var(--win-border-light) var(--win-border-light) var(--win-border-dark);
			box-shadow: inset 1px 1px 0 var(--win-border-darker);
		}

		/* ========== Menu Bar (optional) ========== */
		.win-menubar {
			display: flex;
			background: var(--win-bg);
			border-bottom: 1px solid var(--win-border-light);
			box-shadow: 0 1px 0 var(--win-border-dark);
			padding: 1px 0;
			font-family: "Tahoma", "MS Sans Serif", sans-serif;
			font-size: 11px;
		}

		.win-menubar-item {
			padding: 3px 10px;
			cursor: pointer;
		}

		.win-menubar-item:hover {
			background: var(--win-highlight);
			color: var(--win-highlight-text);
		}
	`;

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
             img-src ${webview.cspSource} data: blob:;
             style-src ${webview.cspSource} 'unsafe-inline';
             script-src ${webview.cspSource} 'nonce-${nonce}' 'wasm-unsafe-eval' 'unsafe-eval';
             worker-src blob:;
             connect-src ${webview.cspSource} data: blob:;" />
  <title>LibGDX Editor</title>
  <style>${win98Css}</style>
</head>
<body>
  <div id="app"></div>
  <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
</body>
</html>`;
}

function getNonce(): string {
	let text = "";
	const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

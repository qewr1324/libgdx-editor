import * as vscode from "vscode";

export type WebviewKind = "viewport" | "inspector";

export function getWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri, kind: WebviewKind): string {
	const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "dist", "webview", `${kind}.js`));
	const nonce = getNonce();

	const baseCss = `
		* { box-sizing: border-box; }

		html, body, #app {
			margin: 0;
			padding: 0;
			width: 100%;
			height: 100%;
			overflow: hidden;
			user-select: none;
		}

		canvas { display: block; }

		/* ============ Toolbar ============ */
		#toolbar {
			position: fixed;
			z-index: 100;
			display: flex;
			align-items: center;
			gap: 4px;
		}

		#toolbar button {
			cursor: pointer;
			font-family: inherit;
			font-size: inherit;
			min-height: 22px;
		}

		#toolbar button:focus {
			outline: none;
		}

		#toolbar-info {
			margin-left: 8px;
			padding: 2px 8px;
			font-size: 11px;
			min-height: 20px;
			line-height: 16px;
		}

		#toolbar-info:empty {
			display: none;
		}

		/* ============ Context Menu ============ */
		#context-menu {
			position: fixed;
			z-index: 1000;
			padding: 4px 0;
			min-width: 180px;
			font-family: inherit;
			font-size: 11px;
		}

		.context-menu-item {
			padding: 4px 20px 4px 24px;
			cursor: pointer;
			display: flex;
			align-items: center;
			gap: 6px;
			white-space: nowrap;
		}

		.context-menu-separator {
			height: 1px;
			margin: 4px 0;
		}

		/* ============ Rulers ============ */
		#ruler-h, #ruler-v {
			display: block;
			user-select: none;
			position: fixed;
			z-index: 50;
			pointer-events: none;
		}

		#ruler-h {
			top: 0;
			left: 0;
			width: 100%;
			height: 20px;
		}

		#ruler-v {
			top: 0;
			left: 0;
			width: 20px;
			height: 100%;
		}

		#ruler-info {
			position: fixed;
			bottom: 4px;
			right: 4px;
			padding: 2px 8px;
			font-size: 11px;
			font-family: monospace;
			z-index: 50;
			pointer-events: none;
			min-width: 70px;
		}

		/* ============ Inspector ============ */
		#app { overflow-y: auto; }

		.empty-state {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			height: 100%;
			padding: 20px;
			text-align: center;
		}

		.empty-icon { font-size: 48px; margin-bottom: 12px; }
		.empty-text { font-size: 12px; font-weight: bold; margin-bottom: 6px; }
		.empty-hint { font-size: 11px; opacity: 0.7; line-height: 1.5; }

		.inspector { padding: 4px; }

		.section {
			margin-bottom: 10px;
			padding: 8px;
			position: relative;
		}

		.section-title {
			font-size: 10px;
			font-weight: 600;
			margin-bottom: 8px;
			display: block;
		}

		.header-section {
			padding: 10px;
		}

		.header-top {
			display: flex;
			gap: 6px;
			align-items: center;
			margin-bottom: 4px;
		}

		.object-type-badge {
			font-size: 10px;
			padding: 2px 8px;
			font-weight: 600;
			text-transform: uppercase;
		}

		.object-id {
			font-size: 10px;
			font-family: monospace;
			word-break: break-all;
		}

		.btn-icon {
			background: transparent;
			border: none;
			cursor: pointer;
			font-size: 14px;
			padding: 4px;
			margin-left: auto;
			color: inherit;
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
		}

		.field input, .field select, .field textarea {
			font-family: inherit;
			font-size: inherit;
			outline: none;
		}

		.field-row { display: flex; gap: 6px; }

		.color-row { display: flex; gap: 4px; align-items: center; }
		.color-row input[type="color"] { width: 32px; height: 22px; padding: 1px; cursor: pointer; }
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

		.texture-row {
			display: flex;
			gap: 6px;
			align-items: center;
			font-family: monospace;
			font-size: 11px;
			word-break: break-all;
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
  <style>${baseCss}</style>
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

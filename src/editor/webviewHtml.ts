import * as vscode from "vscode";

export type WebviewKind = "viewport" | "inspector" | "layers";

export function getWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri, kind: WebviewKind): string {
	const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "dist", "webview", `${kind}.js`));
	const nonce = getNonce();

	const baseCss = `
		* { box-sizing: border-box; margin: 0; padding: 0; }

		html, body, #app {
			width: 100%;
			height: 100%;
			overflow: hidden;
			user-select: none;
		}

		canvas { display: block; }

		/* ============ Toolbar layout ============ */
		#toolbar {
			position: fixed;
			z-index: 100;
			display: flex;
			align-items: center;
		}

		#toolbar button {
			cursor: pointer;
			min-height: 22px;
			font-family: inherit;
			font-size: inherit;
		}

		#toolbar button:focus {
			outline: none;
		}

		#toolbar-info {
			margin-left: 8px;
			font-size: 11px;
			min-height: 20px;
			line-height: 16px;
			padding: 2px 8px;
		}

		#toolbar-info:empty {
			display: none;
		}

		/* ============ Context Menu layout ============ */
		#context-menu {
			position: fixed;
			z-index: 1000;
			min-width: 180px;
			font-family: inherit;
			font-size: 11px;
		}

		.context-menu-item {
			cursor: pointer;
			display: flex;
			align-items: center;
			gap: 6px;
			white-space: nowrap;
		}

		/* ============ Rulers layout ============ */
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

		/* ============ Inspector layout ============ */
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

		.inspector { padding: 4px; }

		.section {
			position: relative;
		}

		.header-top {
			display: flex;
			gap: 6px;
			align-items: center;
			margin-bottom: 4px;
		}

		.btn-icon {
			cursor: pointer;
			margin-left: auto;
		}

		.field {
			display: flex;
			flex-direction: column;
			gap: 2px;
			flex: 1;
			margin-bottom: 6px;
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

		.texture-row {
			display: flex;
			gap: 6px;
			align-items: center;
			font-family: monospace;
			font-size: 11px;
			word-break: break-all;
		}

		.field input,
		.field select,
		.field textarea {
			width: 100%;
			font-family: inherit;
			font-size: inherit;
			outline: none;
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

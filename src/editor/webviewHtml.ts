import * as vscode from "vscode";

export type WebviewKind = "viewport" | "inspector";

export function getWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri, kind: WebviewKind): string {
	const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "dist", "webview", `${kind}.js`));
	const nonce = getNonce();

	const sharedCss = `
		html, body, #app {
			margin: 0; padding: 0; width: 100%; height: 100%;
			overflow: hidden;
			background: var(--vscode-editor-background);
			color: var(--vscode-foreground);
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
		}
		canvas { display: block; }
		#toolbar {
			position: fixed; top: 10px; left: 10px; z-index: 100;
			display: flex; gap: 6px; padding: 6px;
			background: var(--vscode-editorWidget-background);
			border: 1px solid var(--vscode-editorWidget-border);
			border-radius: 6px; align-items: center;
			font-size: 12px;
		}
		#toolbar button {
			background: var(--vscode-button-secondaryBackground);
			color: var(--vscode-button-secondaryForeground);
			border: none; padding: 4px 10px; border-radius: 4px;
			cursor: pointer; font-family: inherit; font-size: inherit;
		}
		#toolbar button:hover { background: var(--vscode-button-secondaryHoverBackground); }
		#toolbar button.active { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
		#toolbar-info { margin-left: 8px; color: var(--vscode-descriptionForeground); font-size: 11px; }
		#context-menu {
			position: fixed; z-index: 1000;
			background: var(--vscode-menu-background);
			color: var(--vscode-menu-foreground);
			border: 1px solid var(--vscode-menu-border);
			border-radius: 4px;
			padding: 4px 0;
			min-width: 180px;
			box-shadow: 0 2px 8px rgba(0,0,0,0.3);
			font-size: 12px;
		}
		.context-menu-item {
			padding: 6px 12px; cursor: pointer;
			display: flex; align-items: center; gap: 6px;
		}
		.context-menu-item:hover { background: var(--vscode-menu-selectionBackground); color: var(--vscode-menu-selectionForeground); }
		.context-menu-separator { height: 1px; background: var(--vscode-menu-border); margin: 4px 0; }
	`;

	const inspectorCss = `
		#app { overflow-y: auto; }
		.empty-state {
			display: flex; flex-direction: column; align-items: center; justify-content: center;
			height: 100%; padding: 20px; text-align: center;
			color: var(--vscode-descriptionForeground);
		}
		.empty-icon { font-size: 48px; opacity: 0.3; margin-bottom: 12px; }
		.empty-text { font-size: 14px; margin-bottom: 4px; }
		.empty-hint { font-size: 11px; opacity: 0.7; line-height: 1.5; }
		.inspector { padding: 8px; }
		.section {
			margin-bottom: 12px; padding: 8px;
			background: var(--vscode-editorWidget-background);
			border-radius: 6px;
		}
		.section-title {
			font-size: 11px; font-weight: 600; text-transform: uppercase;
			color: var(--vscode-descriptionForeground);
			margin-bottom: 8px; letter-spacing: 0.5px;
		}
		.header-section { padding: 10px; }
		.header-top { display: flex; gap: 6px; align-items: center; margin-bottom: 6px; }
		.object-type-badge {
			font-size: 10px; padding: 2px 8px; border-radius: 10px;
			background: var(--vscode-badge-background);
			color: var(--vscode-badge-foreground);
			text-transform: uppercase; font-weight: 600;
		}
		.type-sprite { background: #4a9eff; color: white; }
		.type-shape { background: #ff4a4a; color: white; }
		.type-text { background: #ffffff; color: #1a1a1a; }
		.type-group { background: #9b59b6; color: white; }
		.type-scene { background: #f39c12; color: white; }
		.object-id {
			font-size: 10px; color: var(--vscode-descriptionForeground);
			font-family: monospace; word-break: break-all;
		}
		.btn-icon {
			background: transparent; border: none; cursor: pointer;
			font-size: 14px; padding: 4px; border-radius: 4px;
			color: var(--vscode-foreground); margin-left: auto;
		}
		.btn-icon:hover { background: var(--vscode-toolbar-hoverBackground); }
		.btn-icon.btn-danger:hover { background: #ff4a4a33; }
		.field { margin-bottom: 8px; display: flex; flex-direction: column; gap: 3px; flex: 1; }
		.field label {
			font-size: 10px; color: var(--vscode-descriptionForeground);
			text-transform: uppercase; letter-spacing: 0.3px;
		}
		.field input, .field select, .field textarea {
			background: var(--vscode-input-background);
			color: var(--vscode-input-foreground);
			border: 1px solid var(--vscode-input-border);
			padding: 4px 6px; border-radius: 3px;
			font-family: inherit; font-size: 12px;
			width: 100%; box-sizing: border-box;
		}
		.field input:focus, .field select:focus, .field textarea:focus {
			outline: 1px solid var(--vscode-focusBorder);
			border-color: var(--vscode-focusBorder);
		}
		.field-row { display: flex; gap: 8px; }
		.color-row { display: flex; gap: 6px; align-items: center; }
		.color-row input[type="color"] {
			width: 32px; height: 26px; padding: 0; border: none; cursor: pointer;
			background: transparent;
		}
		.color-row input[type="text"] { flex: 1; }
		.properties-json {
			font-family: monospace !important; font-size: 11px !important;
			resize: vertical;
		}
		.checkbox-row { display: flex; gap: 6px; align-items: center; }
		.checkbox-row input[type="checkbox"] { width: auto; }
		.texture-row {
			display: flex; gap: 6px; align-items: center;
			font-family: monospace; font-size: 11px;
			color: var(--vscode-descriptionForeground);
			word-break: break-all;
		}
	`;

	const css = kind === "inspector" ? inspectorCss : "";

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
  <style>${sharedCss}${css}</style>
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

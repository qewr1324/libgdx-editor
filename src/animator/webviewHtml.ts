import * as vscode from "vscode";

export function getAnimatorWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
	const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "dist", "webview", "animator.js"));
	const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "dist", "webview", "animator.css"));
	const nonce = getNonce();

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
  <title>Animation Editor</title>
  <link rel="stylesheet" href="${cssUri}" />
</head>
<body>
  <div id="animator-root"></div>
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

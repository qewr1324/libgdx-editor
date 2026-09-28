import * as vscode from "vscode";
import type { GameObject } from "../types/scene.js";
import { getWebviewHtml } from "../editor/webviewHtml.js";
import type { ExtensionToWebviewMessage } from "../protocol/messages.js";

export class InspectorProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = "libgdx-editor.inspector";

	private view: vscode.WebviewView | null = null;
	private pendingObject: GameObject | null = null;
	private pendingSelection: string | null = null;

	constructor(private readonly extensionUri: vscode.Uri) {}

	resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken): void {
		this.view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "dist"), vscode.Uri.joinPath(this.extensionUri, "res")],
		};

		webviewView.webview.html = getWebviewHtml(webviewView.webview, this.extensionUri, "inspector");

		webviewView.webview.onDidReceiveMessage((msg) => {
			// پیام‌های inspector را بعداً پردازش می‌کنیم
			console.log("inspector message:", msg);
		});

		// اگر انتخابی قبل از آماده شدن webview انجام شده، الان بفرست
		if (this.pendingSelection !== null) {
			this.postToWebview({
				type: "selectObject",
				objectId: this.pendingSelection,
			});
		}
		if (this.pendingObject) {
			this.postToWebview({
				type: "update",
				scene: {
					version: "1.0",
					name: "",
					worldSize: { width: 0, height: 0 },
					backgroundColor: "",
					gridSize: 0,
					layers: [],
				},
			});
		}
	}

	selectObject(objectId: string | null, object?: GameObject | null): void {
		this.pendingSelection = objectId;
		this.pendingObject = object ?? null;

		this.postToWebview({
			type: "selectObject",
			objectId,
		});
	}

	private postToWebview(msg: ExtensionToWebviewMessage): void {
		this.view?.webview.postMessage(msg);
	}
}

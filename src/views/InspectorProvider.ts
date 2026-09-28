import * as vscode from "vscode";
import type { GameObject, Scene } from "../types/scene.js";
import { getWebviewHtml } from "../editor/webviewHtml.js";
import type { ExtensionToWebviewMessage } from "../protocol/messages.js";

export class InspectorProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = "libgdx-editor.inspector";

	private view: vscode.WebviewView | null = null;
	private currentScene: Scene | null = null;
	private selectedId: string | null = null;

	constructor(private readonly extensionUri: vscode.Uri) {}

	resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken): void {
		this.view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "dist"), vscode.Uri.joinPath(this.extensionUri, "res")],
		};

		webviewView.webview.html = getWebviewHtml(webviewView.webview, this.extensionUri, "inspector");

		webviewView.webview.onDidReceiveMessage((msg) => {
			console.log("inspector message:", msg);
		});

		this.pushSelectionToWebview();
	}

	setSelection(objectId: string | null, scene: Scene): void {
		this.selectedId = objectId;
		this.currentScene = scene;
		this.pushSelectionToWebview();
	}

	setScene(scene: Scene): void {
		this.currentScene = scene;
		this.pushSelectionToWebview();
	}

	private pushSelectionToWebview(): void {
		if (!this.view) return;

		const msg: ExtensionToWebviewMessage = {
			type: "selectObject",
			objectId: this.selectedId,
		};
		this.view.webview.postMessage(msg);

		if (this.selectedId && this.currentScene) {
			const obj = this.findObject(this.currentScene, this.selectedId);
			if (obj) {
				this.view.webview.postMessage({
					type: "objectUpdated",
					object: obj,
				});
			}
		}
	}

	private findObject(scene: Scene, id: string): GameObject | null {
		for (const layer of scene.layers) {
			const found = this.findInObjects(layer.objects, id);
			if (found) return found;
		}
		return null;
	}

	private findInObjects(objects: GameObject[], id: string): GameObject | null {
		for (const obj of objects) {
			if (obj.id === id) return obj;
			if (obj.children) {
				const found = this.findInObjects(obj.children, id);
				if (found) return found;
			}
		}
		return null;
	}
}

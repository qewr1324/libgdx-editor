import * as vscode from "vscode";
import { createEmptyScene, type Scene } from "../types/scene.js";
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from "../protocol/messages.js";
import { getWebviewHtml } from "./webviewHtml.js";

export class SceneEditorProvider implements vscode.CustomTextEditorProvider {
	public static readonly viewType = "libgdx-editor.sceneEditor";

	private static instances = new Set<SceneEditorProvider>();
	private static activeEditor: SceneEditorProvider | null = null;

	private activeWebview: vscode.Webview | null = null;

	constructor(private readonly context: vscode.ExtensionContext) {
		SceneEditorProvider.instances.add(this);
	}

	public static register(context: vscode.ExtensionContext): vscode.Disposable {
		const provider = new SceneEditorProvider(context);
		return vscode.window.registerCustomEditorProvider(SceneEditorProvider.viewType, provider, {
			webviewOptions: { retainContextWhenHidden: true },
			supportsMultipleEditorsPerDocument: false,
		});
	}

	public static broadcastToAll(msg: ExtensionToWebviewMessage): void {
		for (const inst of SceneEditorProvider.instances) {
			inst.activeWebview?.postMessage(msg);
		}
	}

	public async resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken): Promise<void> {
		webviewPanel.webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, "dist"), vscode.Uri.joinPath(this.context.extensionUri, "res")],
		};

		webviewPanel.webview.html = getWebviewHtml(webviewPanel.webview, this.context.extensionUri, "viewport");

		this.activeWebview = webviewPanel.webview;
		SceneEditorProvider.activeEditor = this;

		const sendScene = () => {
			const scene = this.parseDocument(document);
			const msg: ExtensionToWebviewMessage = { type: "load", scene };
			webviewPanel.webview.postMessage(msg);
		};

		webviewPanel.webview.onDidReceiveMessage(async (msg: WebviewToExtensionMessage) => {
			switch (msg.type) {
				case "ready":
					sendScene();
					break;
				case "save":
					await this.writeDocument(document, msg.scene);
					break;
				case "sceneChanged":
					break;
			}
		});

		const changeSub = vscode.workspace.onDidChangeTextDocument((e) => {
			if (e.document.uri.toString() === document.uri.toString()) {
				sendScene();
			}
		});

		webviewPanel.onDidDispose(() => {
			changeSub.dispose();
			SceneEditorProvider.instances.delete(this);
			if (SceneEditorProvider.activeEditor === this) {
				SceneEditorProvider.activeEditor = null;
			}
			if (this.activeWebview === webviewPanel.webview) {
				this.activeWebview = null;
			}
		});
	}

	private parseDocument(document: vscode.TextDocument): Scene {
		const text = document.getText();
		if (!text.trim()) {
			return createEmptyScene(document.uri.path.split("/").pop()?.replace(".lgdx.json", "") ?? "untitled");
		}
		try {
			return JSON.parse(text) as Scene;
		} catch {
			vscode.window.showErrorMessage("فایل صحنه معتبر نیست. یک صحنه خالی ساخته می‌شود.");
			return createEmptyScene();
		}
	}

	private async writeDocument(document: vscode.TextDocument, scene: Scene): Promise<void> {
		const edit = new vscode.WorkspaceEdit();
		const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
		edit.replace(document.uri, fullRange, JSON.stringify(scene, null, 2));
		await vscode.workspace.applyEdit(edit);
		await document.save();
	}
}

import * as vscode from "vscode";
import { createEmptyScene, type GameObject, type Scene } from "../types/scene.js";
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from "../protocol/messages.js";
import { getWebviewHtml } from "./webviewHtml.js";

export type ObjectSelectionHandler = (objectId: string | null, scene: Scene) => void;
export type SceneChangeHandler = (scene: Scene) => void;

export class SceneEditorProvider implements vscode.CustomTextEditorProvider {
	public static readonly viewType = "libgdx-editor.sceneEditor";

	private static instances = new Set<SceneEditorProvider>();
	private static selectionHandlers = new Set<ObjectSelectionHandler>();
	private static sceneChangeHandlers = new Set<SceneChangeHandler>();

	private activeWebview: vscode.Webview | null = null;
	private currentScene: Scene | null = null;
	private currentDocument: vscode.TextDocument | null = null;

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
			try {
				inst.activeWebview?.postMessage(msg);
			} catch {
				// webview ممکن است dispose شده باشد
			}
		}
	}

	public static onDidSelectObject(handler: ObjectSelectionHandler): vscode.Disposable {
		SceneEditorProvider.selectionHandlers.add(handler);
		return {
			dispose: () => SceneEditorProvider.selectionHandlers.delete(handler),
		};
	}

	public static onDidChangeScene(handler: SceneChangeHandler): vscode.Disposable {
		SceneEditorProvider.sceneChangeHandlers.add(handler);
		return {
			dispose: () => SceneEditorProvider.sceneChangeHandlers.delete(handler),
		};
	}

	public async resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken): Promise<void> {
		webviewPanel.webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, "dist"), vscode.Uri.joinPath(this.context.extensionUri, "res")],
		};

		webviewPanel.webview.html = getWebviewHtml(webviewPanel.webview, this.context.extensionUri, "viewport");

		this.activeWebview = webviewPanel.webview;
		this.currentDocument = document;

		const sendScene = () => {
			const scene = this.parseDocument(document);
			this.currentScene = scene;
			const msg: ExtensionToWebviewMessage = { type: "load", scene };
			webviewPanel.webview.postMessage(msg);
			for (const handler of SceneEditorProvider.sceneChangeHandlers) {
				handler(scene);
			}
		};

		webviewPanel.webview.onDidReceiveMessage(async (msg: WebviewToExtensionMessage) => {
			switch (msg.type) {
				case "ready":
					sendScene();
					break;
				case "save":
					await this.writeDocument(document, msg.scene);
					this.currentScene = msg.scene;
					for (const handler of SceneEditorProvider.sceneChangeHandlers) {
						handler(msg.scene);
					}
					break;
				case "sceneChanged":
					this.currentScene = msg.scene;
					for (const handler of SceneEditorProvider.sceneChangeHandlers) {
						handler(msg.scene);
					}
					break;
				case "selectObject": {
					const scene = this.currentScene ?? this.parseDocument(document);
					for (const handler of SceneEditorProvider.selectionHandlers) {
						handler(msg.objectId, scene);
					}
					break;
				}
				case "requestAddObject": {
					if (!this.currentScene) break;
					const newObj = this.createObjectAt(msg.objectType, msg.x, msg.y);
					const updated = this.addObjectToScene(this.currentScene, newObj);
					this.currentScene = updated;
					webviewPanel.webview.postMessage({ type: "update", scene: updated } satisfies ExtensionToWebviewMessage);
					for (const handler of SceneEditorProvider.sceneChangeHandlers) {
						handler(updated);
					}
					break;
				}
				case "updateObject": {
					if (!this.currentScene) break;
					const updated = this.updateObjectInScene(this.currentScene, msg.object);
					this.currentScene = updated;
					for (const handler of SceneEditorProvider.sceneChangeHandlers) {
						handler(updated);
					}
					break;
				}
				case "deleteObject": {
					if (!this.currentScene) break;
					const updated = this.deleteObjectFromScene(this.currentScene, msg.objectId);
					this.currentScene = updated;
					webviewPanel.webview.postMessage({ type: "update", scene: updated } satisfies ExtensionToWebviewMessage);
					for (const handler of SceneEditorProvider.sceneChangeHandlers) {
						handler(updated);
					}
					break;
				}
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
			if (this.activeWebview === webviewPanel.webview) {
				this.activeWebview = null;
			}
			if (this.currentDocument === document) {
				this.currentDocument = null;
			}
		});
	}

	private createObjectAt(type: GameObject["type"], x: number, y: number): GameObject {
		const id = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
		const names: Record<string, string> = {
			sprite: "sprite",
			shape: "shape",
			text: "text",
			group: "group",
		};
		const colors: Record<string, string> = {
			sprite: "#4a9eff",
			shape: "#ff4a4a",
			text: "#ffffff",
			group: "#9b59b6",
		};
		return {
			id,
			type,
			name: `${names[type]}_${id.slice(-4)}`,
			color: colors[type],
			transform: {
				x,
				y,
				width: 64,
				height: 64,
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
				originX: 0.5,
				originY: 0.5,
			},
			properties: {},
		};
	}

	private addObjectToScene(scene: Scene, obj: GameObject): Scene {
		const newScene = structuredClone(scene) as Scene;
		if (newScene.layers.length === 0) {
			newScene.layers.push({
				name: "default",
				zIndex: 0,
				visible: true,
				objects: [],
			});
		}
		newScene.layers[0].objects.push(obj);
		return newScene;
	}

	private updateObjectInScene(scene: Scene, updated: GameObject): Scene {
		const newScene = structuredClone(scene) as Scene;
		for (const layer of newScene.layers) {
			const idx = layer.objects.findIndex((o) => o.id === updated.id);
			if (idx !== -1) {
				layer.objects[idx] = updated;
				return newScene;
			}
		}
		return newScene;
	}

	private deleteObjectFromScene(scene: Scene, id: string): Scene {
		const newScene = structuredClone(scene) as Scene;
		for (const layer of newScene.layers) {
			layer.objects = layer.objects.filter((o) => o.id !== id);
		}
		return newScene;
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

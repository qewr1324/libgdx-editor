import * as vscode from "vscode";
import { createEmptyScene, type GameObject, type Scene } from "../types/scene.js";
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from "../protocol/messages.js";
import { getWebviewHtml } from "./webviewHtml.js";
import { AssetManager } from "./assetManager.js";
import { HistoryManager } from "./historyManager.js";

export type ObjectSelectionHandler = (objectIds: string[], scene: Scene) => void;
export type SceneChangeHandler = (scene: Scene) => void;
export type OpenSceneSettingsHandler = (scene: Scene) => void;

export class SceneEditorProvider implements vscode.CustomTextEditorProvider {
	public static readonly viewType = "libgdx-editor.sceneEditor";

	private static instances = new Set<SceneEditorProvider>();
	private static activeInstance: SceneEditorProvider | null = null;
	private static selectionHandlers = new Set<ObjectSelectionHandler>();
	private static sceneChangeHandlers = new Set<SceneChangeHandler>();
	private static openSceneSettingsHandlers = new Set<OpenSceneSettingsHandler>();

	private activeWebview: vscode.Webview | null = null;
	private currentScene: Scene | null = null;
	private currentDocument: vscode.TextDocument | null = null;
	private isDirty = false;
	private autoSaveTimer: NodeJS.Timeout | null = null;
	private history: HistoryManager = new HistoryManager();
	private isProgrammaticChange = false;

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
				// ignore
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

	public static onDidRequestSceneSettings(handler: OpenSceneSettingsHandler): vscode.Disposable {
		SceneEditorProvider.openSceneSettingsHandlers.add(handler);
		return {
			dispose: () => SceneEditorProvider.openSceneSettingsHandlers.delete(handler),
		};
	}

	/**
	 * فقط instance فعال را برمی‌گرداند.
	 */
	public static getActiveInstance(): SceneEditorProvider | null {
		return SceneEditorProvider.activeInstance;
	}

	public static getScene(): Scene | null {
		const active = SceneEditorProvider.activeInstance;
		if (active?.currentScene) return active.currentScene;
		// اگر فعال نیست، اولین instance با scene
		for (const inst of SceneEditorProvider.instances) {
			if (inst.currentScene) return inst.currentScene;
		}
		return null;
	}

	public static getCurrentSceneUri(): vscode.Uri | null {
		const active = SceneEditorProvider.activeInstance;
		if (active?.currentDocument) return active.currentDocument.uri;
		for (const inst of SceneEditorProvider.instances) {
			if (inst.currentDocument) return inst.currentDocument.uri;
		}
		return null;
	}

	/**
	 * فقط روی instance فعال اجرا می‌شود.
	 */
	public static updateObject(obj: GameObject, historyLabel = "update object"): void {
		const active = SceneEditorProvider.activeInstance;
		if (!active?.currentScene) return;
		const updated = active.updateObjectInScene(active.currentScene, obj);
		active.currentScene = updated;
		active.markDirty();
		active.history.push(updated, historyLabel);
		active.broadcastUpdate(updated);
		active.broadcastHistoryState();
	}

	public static deleteObject(objectId: string): void {
		const active = SceneEditorProvider.activeInstance;
		if (!active?.currentScene) return;
		const updated = active.deleteObjectFromScene(active.currentScene, objectId);
		active.currentScene = updated;
		active.markDirty();
		active.history.push(updated, "delete object");
		active.broadcastUpdate(updated);
		active.broadcastHistoryState();
	}

	public static focusObject(objectId: string): void {
		const active = SceneEditorProvider.activeInstance;
		if (!active?.activeWebview) return;
		try {
			active.activeWebview.postMessage({ type: "focusObject", objectId } satisfies ExtensionToWebviewMessage);
		} catch {
			// ignore
		}
	}

	public static updateSceneField(field: string, value: unknown, historyLabel = "update scene"): void {
		const active = SceneEditorProvider.activeInstance;
		if (!active?.currentScene) return;
		const updated = structuredClone(active.currentScene) as Scene;
		const keys = field.split(".");
		if (keys.length === 1) {
			(updated as unknown as Record<string, unknown>)[keys[0]] = value;
		} else if (keys.length === 2) {
			const parent = (updated as unknown as Record<string, unknown>)[keys[0]] as Record<string, unknown>;
			parent[keys[1]] = value;
		}
		active.currentScene = updated;
		active.markDirty();
		active.history.push(updated, historyLabel);
		active.broadcastUpdate(updated);
		active.broadcastHistoryState();
	}

	public static async addSpriteWithTexture(texturePath: string, width?: number, height?: number): Promise<boolean> {
		const active = SceneEditorProvider.activeInstance;
		if (!active?.currentScene || !active.currentDocument) return false;

		const scene = active.currentScene;
		const defaultX = Math.round(scene.worldSize.width / 2);
		const defaultY = Math.round(scene.worldSize.height / 2);

		const newObj = active.createObjectAt("sprite", defaultX, defaultY);
		newObj.texture = texturePath;
		newObj.name = `sprite_${newObj.id.slice(-4)}`;

		if (width && height) {
			newObj.transform.width = width;
			newObj.transform.height = height;
		}

		const updated = active.addObjectToScene(scene, newObj);
		active.currentScene = updated;
		active.markDirty();
		active.history.push(updated, "add texture");

		const textures = await AssetManager.loadTexturesAsDataUrls(active.currentDocument.uri, updated);
		active.activeWebview?.postMessage({ type: "texturesLoaded", textures } satisfies ExtensionToWebviewMessage);

		active.broadcastUpdate(updated);
		active.broadcastHistoryState();
		return true;
	}

	public static duplicateObjects(objectIds: string[], offsetX: number, offsetY: number): void {
		const active = SceneEditorProvider.activeInstance;
		if (!active?.currentScene) return;

		const updated = structuredClone(active.currentScene) as Scene;
		const newIds: string[] = [];

		for (const layer of updated.layers) {
			const objectsToClone: GameObject[] = [];
			for (const obj of layer.objects) {
				if (objectIds.includes(obj.id)) {
					const clone = structuredClone(obj) as GameObject;
					clone.id = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
					clone.name = `${obj.name}_copy`;
					clone.transform.x += offsetX;
					clone.transform.y += offsetY;
					objectsToClone.push(clone);
					newIds.push(clone.id);
				}
			}
			layer.objects.push(...objectsToClone);
		}

		active.currentScene = updated;
		active.markDirty();
		active.history.push(updated, "duplicate");
		active.broadcastUpdate(updated);
		active.broadcastHistoryState();

		setTimeout(() => {
			try {
				active.activeWebview?.postMessage({ type: "selectObjects", objectIds: newIds } satisfies ExtensionToWebviewMessage);
			} catch {
				// ignore
			}
		}, 50);
	}

	public static undo(): void {
		const active = SceneEditorProvider.activeInstance;
		if (!active?.currentScene) return;
		const scene = active.history.undo();
		if (!scene) return;
		active.currentScene = scene;
		active.markDirty();
		active.broadcastUpdate(scene);
		active.broadcastHistoryState();
	}

	public static redo(): void {
		const active = SceneEditorProvider.activeInstance;
		if (!active?.currentScene) return;
		const scene = active.history.redo();
		if (!scene) return;
		active.currentScene = scene;
		active.markDirty();
		active.broadcastUpdate(scene);
		active.broadcastHistoryState();
	}

	public static async importTextureAt(x: number, y: number): Promise<void> {
		const active = SceneEditorProvider.activeInstance;
		if (!active?.currentDocument || !active.currentScene) return;
		await active.doImportTexture(x, y, false);
	}

	public static async importTextureDialog(): Promise<void> {
		const active = SceneEditorProvider.activeInstance;
		if (!active?.currentDocument || !active.currentScene) return;
		await active.doImportTexture(0, 0, true);
	}

	public async resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken): Promise<void> {
		webviewPanel.webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, "dist"), vscode.Uri.joinPath(this.context.extensionUri, "res"), vscode.Uri.joinPath(document.uri, "..")],
		};

		webviewPanel.webview.html = getWebviewHtml(webviewPanel.webview, this.context.extensionUri, "viewport");

		this.activeWebview = webviewPanel.webview;
		this.currentDocument = document;

		// ⭐ این instance را فعال کن وقتی webview اش focus گرفت
		SceneEditorProvider.activeInstance = this;

		const sendScene = async () => {
			const scene = this.parseDocument(document);
			this.currentScene = scene;
			this.history.reset(scene);
			const msg: ExtensionToWebviewMessage = { type: "load", scene };
			webviewPanel.webview.postMessage(msg);

			const textures = await AssetManager.loadTexturesAsDataUrls(document.uri, scene);
			webviewPanel.webview.postMessage({ type: "texturesLoaded", textures } satisfies ExtensionToWebviewMessage);

			this.broadcastHistoryState();

			// فقط اگر این instance فعال است، به inspector بفرست
			if (SceneEditorProvider.activeInstance === this) {
				for (const handler of SceneEditorProvider.sceneChangeHandlers) {
					handler(scene);
				}
			}
		};

		const sendSceneUpdate = async () => {
			if (this.isProgrammaticChange) {
				this.isProgrammaticChange = false;
				return;
			}

			const scene = this.parseDocument(document);
			this.currentScene = scene;
			const msg: ExtensionToWebviewMessage = { type: "load", scene };
			webviewPanel.webview.postMessage(msg);

			const textures = await AssetManager.loadTexturesAsDataUrls(document.uri, scene);
			webviewPanel.webview.postMessage({ type: "texturesLoaded", textures } satisfies ExtensionToWebviewMessage);

			if (SceneEditorProvider.activeInstance === this) {
				for (const handler of SceneEditorProvider.sceneChangeHandlers) {
					handler(scene);
				}
			}
		};

		// ⭐ وقتی panel فعال شد، این instance را active کن
		const viewStateSub = webviewPanel.onDidChangeViewState(() => {
			if (webviewPanel.active) {
				SceneEditorProvider.activeInstance = this;
				// scene را به inspector بفرست
				if (this.currentScene) {
					for (const handler of SceneEditorProvider.sceneChangeHandlers) {
						handler(this.currentScene);
					}
				}
			}
		});

		webviewPanel.webview.onDidReceiveMessage(async (msg: WebviewToExtensionMessage) => {
			switch (msg.type) {
				case "ready":
					await sendScene();
					break;
				case "save":
					await this.writeDocument(document, msg.scene);
					this.currentScene = msg.scene;
					this.isDirty = false;
					this.isProgrammaticChange = true;
					if (SceneEditorProvider.activeInstance === this) {
						for (const handler of SceneEditorProvider.sceneChangeHandlers) {
							handler(msg.scene);
						}
					}
					break;
				case "sceneChanged":
					this.currentScene = msg.scene;
					this.markDirty();
					if (SceneEditorProvider.activeInstance === this) {
						for (const handler of SceneEditorProvider.sceneChangeHandlers) {
							handler(msg.scene);
						}
					}
					break;
				case "selectObject": {
					SceneEditorProvider.activeInstance = this;
					const scene = this.currentScene ?? this.parseDocument(document);
					const ids = msg.objectId ? [msg.objectId] : [];
					for (const handler of SceneEditorProvider.selectionHandlers) {
						handler(ids, scene);
					}
					break;
				}
				case "selectObjects": {
					SceneEditorProvider.activeInstance = this;
					const scene = this.currentScene ?? this.parseDocument(document);
					for (const handler of SceneEditorProvider.selectionHandlers) {
						handler(msg.objectIds, scene);
					}
					break;
				}
				case "requestAddObject": {
					SceneEditorProvider.activeInstance = this;
					if (!this.currentScene) break;
					const newObj = this.createObjectAt(msg.objectType, msg.x, msg.y);
					const updated = this.addObjectToScene(this.currentScene, newObj);
					this.currentScene = updated;
					this.markDirty();
					this.history.push(updated, `add ${msg.objectType}`);
					this.broadcastUpdate(updated);
					this.broadcastHistoryState();
					break;
				}
				case "requestAddTexture": {
					SceneEditorProvider.activeInstance = this;
					await this.doImportTexture(msg.x, msg.y, false);
					break;
				}
				case "requestImportTexture": {
					SceneEditorProvider.activeInstance = this;
					await this.doImportTexture(0, 0, true);
					break;
				}
				case "updateObject": {
					SceneEditorProvider.activeInstance = this;
					if (!this.currentScene) break;
					const updated = this.updateObjectInScene(this.currentScene, msg.object);
					this.currentScene = updated;
					this.markDirty();
					this.history.push(updated, msg.historyLabel ?? "update object");
					this.broadcastUpdate(updated);
					this.broadcastHistoryState();
					break;
				}
				case "updateObjects": {
					SceneEditorProvider.activeInstance = this;
					if (!this.currentScene) break;
					let updated = this.currentScene;
					for (const obj of msg.objects) {
						updated = this.updateObjectInScene(updated, obj);
					}
					this.currentScene = updated;
					this.markDirty();
					this.history.push(updated, msg.historyLabel ?? "update objects");
					this.broadcastUpdate(updated);
					this.broadcastHistoryState();
					break;
				}
				case "updateSceneField": {
					SceneEditorProvider.activeInstance = this;
					SceneEditorProvider.updateSceneField(msg.field, msg.value, msg.historyLabel ?? `update ${msg.field}`);
					break;
				}
				case "deleteObject": {
					SceneEditorProvider.activeInstance = this;
					if (!this.currentScene) break;
					const updated = this.deleteObjectFromScene(this.currentScene, msg.objectId);
					this.currentScene = updated;
					this.markDirty();
					this.history.push(updated, "delete object");
					this.broadcastUpdate(updated);
					this.broadcastHistoryState();
					break;
				}
				case "deleteObjects": {
					SceneEditorProvider.activeInstance = this;
					if (!this.currentScene) break;
					let updated = this.currentScene;
					for (const id of msg.objectIds) {
						updated = this.deleteObjectFromScene(updated, id);
					}
					this.currentScene = updated;
					this.markDirty();
					this.history.push(updated, "delete objects");
					this.broadcastUpdate(updated);
					this.broadcastHistoryState();
					break;
				}
				case "duplicateObjects": {
					SceneEditorProvider.activeInstance = this;
					SceneEditorProvider.duplicateObjects(msg.objectIds, msg.offsetX, msg.offsetY);
					break;
				}
				case "openSceneSettings": {
					SceneEditorProvider.activeInstance = this;
					const scene = this.currentScene ?? this.parseDocument(document);
					for (const handler of SceneEditorProvider.openSceneSettingsHandlers) {
						handler(scene);
					}
					break;
				}
				case "undo": {
					SceneEditorProvider.activeInstance = this;
					SceneEditorProvider.undo();
					break;
				}
				case "redo": {
					SceneEditorProvider.activeInstance = this;
					SceneEditorProvider.redo();
					break;
				}
			}
		});

		const changeSub = vscode.workspace.onDidChangeTextDocument((e) => {
			if (e.document.uri.toString() === document.uri.toString()) {
				if (this.isProgrammaticChange) {
					this.isProgrammaticChange = false;
					return;
				}
				void sendSceneUpdate();
			}
		});

		webviewPanel.onDidDispose(() => {
			changeSub.dispose();
			viewStateSub.dispose();
			if (this.autoSaveTimer) {
				clearTimeout(this.autoSaveTimer);
				this.autoSaveTimer = null;
			}
			SceneEditorProvider.instances.delete(this);
			if (SceneEditorProvider.activeInstance === this) {
				// یک instance دیگر را فعال کن اگر وجود دارد
				const remaining = Array.from(SceneEditorProvider.instances);
				SceneEditorProvider.activeInstance = remaining.length > 0 ? remaining[0] : null;
			}
			if (this.activeWebview === webviewPanel.webview) {
				this.activeWebview = null;
			}
			if (this.currentDocument === document) {
				this.currentDocument = null;
			}
		});
	}

	private broadcastUpdate(scene: Scene): void {
		// فقط به webview خودم بفرست
		try {
			this.activeWebview?.postMessage({ type: "update", scene } satisfies ExtensionToWebviewMessage);
		} catch {
			// ignore
		}
		// فقط اگر این instance فعال است، به inspector بفرست
		if (SceneEditorProvider.activeInstance === this) {
			for (const handler of SceneEditorProvider.sceneChangeHandlers) {
				handler(scene);
			}
		}
	}

	private broadcastHistoryState(): void {
		try {
			this.activeWebview?.postMessage({
				type: "historyState",
				canUndo: this.history.canUndo(),
				canRedo: this.history.canRedo(),
			} satisfies ExtensionToWebviewMessage);
		} catch {
			// ignore
		}
	}

	private markDirty(): void {
		this.isDirty = true;
		if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
		this.autoSaveTimer = setTimeout(() => {
			void this.autoSave();
		}, 3000);
	}

	private async autoSave(): Promise<void> {
		if (!this.currentDocument || !this.currentScene || !this.isDirty) return;
		try {
			this.isProgrammaticChange = true;
			await this.writeDocument(this.currentDocument, this.currentScene);
			this.isDirty = false;
		} catch (err) {
			console.error("Auto-save failed:", err);
			this.isProgrammaticChange = false;
		}
	}

	private async doImportTexture(x: number, y: number, dialogOnly: boolean): Promise<void> {
		if (!this.currentDocument || !this.currentScene) return;

		const uris = await vscode.window.showOpenDialog({
			canSelectMany: false,
			filters: { Images: ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"] },
			title: "Import Texture",
		});
		if (!uris || uris.length === 0) return;

		try {
			const dims = await AssetManager.getImageDimensions(uris[0]);

			let scale = 1.0;
			if (!dialogOnly && dims) {
				const scaleInput = await vscode.window.showInputBox({
					title: "Import Texture",
					prompt: `Image size: ${dims.width} × ${dims.height}px — Enter scale factor`,
					value: "1.0",
					validateInput: (value) => {
						const num = Number.parseFloat(value);
						if (Number.isNaN(num)) return "Must be a number";
						if (num <= 0) return "Must be greater than 0";
						return null;
					},
				});
				if (scaleInput === undefined) return;
				scale = Number.parseFloat(scaleInput);
				if (Number.isNaN(scale) || scale <= 0) scale = 1.0;
			}

			const relativePath = await AssetManager.importTexture(this.currentDocument.uri, uris[0]);

			if (dialogOnly) {
				vscode.window.showInformationMessage(`Texture imported: ${relativePath}${dims ? ` (${dims.width}×${dims.height})` : ""}`);
				const textures = await AssetManager.loadTexturesAsDataUrls(this.currentDocument.uri, this.currentScene);
				this.activeWebview?.postMessage({ type: "texturesLoaded", textures } satisfies ExtensionToWebviewMessage);
				return;
			}

			const newObj = this.createObjectAt("sprite", x, y);
			newObj.texture = relativePath;
			newObj.name = `sprite_${newObj.id.slice(-4)}`;

			if (dims) {
				newObj.transform.width = Math.round(dims.width * scale);
				newObj.transform.height = Math.round(dims.height * scale);
			}

			const updated = this.addObjectToScene(this.currentScene, newObj);
			this.currentScene = updated;
			this.markDirty();
			this.history.push(updated, "import texture");

			const textures = await AssetManager.loadTexturesAsDataUrls(this.currentDocument.uri, updated);
			this.activeWebview?.postMessage({ type: "texturesLoaded", textures } satisfies ExtensionToWebviewMessage);
			this.broadcastUpdate(updated);
			this.broadcastHistoryState();
		} catch (err) {
			vscode.window.showErrorMessage(`Failed to import texture: ${err instanceof Error ? err.message : String(err)}`);
		}
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
				locked: false,
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
			const parsed = JSON.parse(text) as Scene;
			if (!parsed.theme) parsed.theme = "win98";
			if (!parsed.camera) parsed.camera = { x: 0, y: 0, zoom: 1 };
			if (typeof parsed.snapToGrid !== "boolean") parsed.snapToGrid = false;
			if (typeof parsed.snapToObjects !== "boolean") parsed.snapToObjects = false;
			for (const layer of parsed.layers) {
				if (typeof layer.visible !== "boolean") layer.visible = true;
				if (typeof layer.locked !== "boolean") layer.locked = false;
			}
			return parsed;
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

		try {
			await AssetManager.cleanupUnusedAssets(document.uri, scene);
		} catch {
			// ignore
		}
	}
}

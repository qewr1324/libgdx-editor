import * as vscode from "vscode";
import type { GameObject, Scene } from "../types/scene.js";
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from "../protocol/messages.js";
import { getWebviewHtml } from "./webviewHtml.js";
import { HistoryManager } from "./historyManager.js";
import { SceneRegistry } from "./scene-registry.js";
import { parseDocument, writeDocument } from "./scene-parser.js";
import type { SceneHost } from "./scene-types.js";
import { handleWebviewMessage, sendScene, sendSceneUpdate } from "./message-handler.js";
import { addSpriteWithTextureOp, deleteObjectOp, duplicateObjectsOp, focusObjectOp, importTextureAtOp, importTextureDialogOp, redoOp, undoOp, updateObjectOp, updateSceneFieldOp } from "./scene-ops.js";
import type { LibGdxEditorConfig } from "../config/config-types.js";

export type { ObjectSelectionHandler, SceneChangeHandler, OpenSceneSettingsHandler } from "./scene-types.js";

export class SceneEditorProvider implements vscode.CustomTextEditorProvider, SceneHost {
	public static readonly viewType = "libgdx-editor.sceneEditor";

	public static onDidSelectObject(handler: Parameters<typeof SceneRegistry.onDidSelectObject>[0]): vscode.Disposable {
		return SceneRegistry.onDidSelectObject(handler);
	}

	public static onDidChangeScene(handler: Parameters<typeof SceneRegistry.onDidChangeScene>[0]): vscode.Disposable {
		return SceneRegistry.onDidChangeScene(handler);
	}

	public static onDidRequestSceneSettings(handler: Parameters<typeof SceneRegistry.onDidRequestSceneSettings>[0]): vscode.Disposable {
		return SceneRegistry.onDidRequestSceneSettings(handler);
	}

	public static getAllInstances(): SceneEditorProvider[] {
		return SceneRegistry.getInstances() as SceneEditorProvider[];
	}

	public static setActiveInstance(instance: SceneEditorProvider | null): void {
		SceneRegistry.setActiveInstance(instance);
	}

	public static broadcastConfigChange(config: LibGdxEditorConfig): void {
		const instances = SceneRegistry.getInstances();
		console.log("[SceneEditorProvider] broadcastConfigChange to", instances.length, "instances");
		for (const inst of instances) {
			const instance = inst as unknown as SceneEditorProvider;
			try {
				const hasWebview = instance.activeWebview !== null;
				console.log("[SceneEditorProvider] posting to webview:", hasWebview, "for doc:", instance.currentDocument?.uri.fsPath);
				instance.activeWebview?.postMessage({
					type: "configUpdated",
					config: {
						version: config.version,
						defaultTheme: config.defaultTheme,
						autoSaveDelayMs: config.autoSaveDelayMs,
						showRulers: config.showRulers,
						showGrid: config.showGrid,
						defaultGridSize: config.defaultGridSize,
					},
				} satisfies ExtensionToWebviewMessage);
			} catch (err) {
				console.error("[SceneEditorProvider] postMessage failed:", err);
			}
		}
	}

	public static updateObject(obj: GameObject, historyLabel?: string): void {
		updateObjectOp(obj, historyLabel);
	}

	public static deleteObject(objectId: string): void {
		deleteObjectOp(objectId);
	}

	public static focusObject(objectId: string): void {
		focusObjectOp(objectId);
	}

	public static updateSceneField(field: string, value: unknown, historyLabel?: string): void {
		updateSceneFieldOp(field, value, historyLabel);
	}

	public static async addSpriteWithTexture(texturePath: string, width?: number, height?: number): Promise<boolean> {
		return addSpriteWithTextureOp(texturePath, width, height);
	}

	public static duplicateObjects(objectIds: string[], offsetX: number, offsetY: number): void {
		duplicateObjectsOp(objectIds, offsetX, offsetY);
	}

	public static undo(): void {
		undoOp();
	}

	public static redo(): void {
		redoOp();
	}

	public static async importTextureAt(x: number, y: number): Promise<void> {
		await importTextureAtOp(x, y);
	}

	public static async importTextureDialog(): Promise<void> {
		await importTextureDialogOp();
	}

	private activeWebview: vscode.Webview | null = null;
	private currentScene: Scene | null = null;
	private currentDocument: vscode.TextDocument | null = null;
	private isDirty = false;
	private autoSaveTimer: NodeJS.Timeout | null = null;
	private history: HistoryManager = new HistoryManager();
	private isProgrammaticChange = false;

	constructor(private readonly context: vscode.ExtensionContext) {
		SceneRegistry.addInstance(this);
	}

	public static register(context: vscode.ExtensionContext): vscode.Disposable {
		const provider = new SceneEditorProvider(context);
		return vscode.window.registerCustomEditorProvider(SceneEditorProvider.viewType, provider, {
			webviewOptions: { retainContextWhenHidden: true },
			supportsMultipleEditorsPerDocument: false,
		});
	}

	public getScene(): Scene | null {
		return this.currentScene;
	}

	public setScene(scene: Scene): void {
		this.currentScene = scene;
	}

	public getDocument(): vscode.TextDocument | null {
		return this.currentDocument;
	}

	public postToWebview(msg: unknown): void {
		try {
			this.activeWebview?.postMessage(msg);
		} catch {
			// ignore
		}
	}

	public markDirty(): void {
		this.isDirty = true;
		if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
		this.autoSaveTimer = setTimeout(() => {
			void this.autoSave();
		}, 3000);
	}

	public async autoSave(): Promise<void> {
		if (!this.currentDocument || !this.currentScene || !this.isDirty) return;
		try {
			this.isProgrammaticChange = true;
			await writeDocument(this.currentDocument, this.currentScene);
			this.isDirty = false;
		} catch (err) {
			console.error("Auto-save failed:", err);
			this.isProgrammaticChange = false;
		}
	}

	public pushHistory(scene: Scene, label: string): void {
		this.history.push(scene, label);
	}

	public resetHistory(scene: Scene): void {
		this.history.reset(scene);
	}

	public undoHistory(): Scene | null {
		return this.history.undo();
	}

	public redoHistory(): Scene | null {
		return this.history.redo();
	}

	public canUndo(): boolean {
		return this.history.canUndo();
	}

	public canRedo(): boolean {
		return this.history.canRedo();
	}

	public broadcastUpdate(scene: Scene): void {
		this.postToWebview({ type: "update", scene } satisfies ExtensionToWebviewMessage);
		if (this.isActive()) {
			SceneRegistry.emitSceneChange(scene);
		}
	}

	public broadcastHistoryState(): void {
		this.postToWebview({
			type: "historyState",
			canUndo: this.history.canUndo(),
			canRedo: this.history.canRedo(),
		} satisfies ExtensionToWebviewMessage);
	}

	public isActive(): boolean {
		return SceneRegistry.isActive(this);
	}

	public matchesDocument(document: vscode.TextDocument): boolean {
		return this.currentDocument?.uri.toString() === document.uri.toString();
	}

	public getCurrentScene(): Scene | null {
		return this.currentScene;
	}

	public async resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken): Promise<void> {
		webviewPanel.webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, "dist"), vscode.Uri.joinPath(this.context.extensionUri, "res"), vscode.Uri.joinPath(document.uri, "..")],
		};

		webviewPanel.webview.html = getWebviewHtml(webviewPanel.webview, this.context.extensionUri, "viewport");

		this.activeWebview = webviewPanel.webview;
		this.currentDocument = document;

		SceneRegistry.setActiveInstance(this);

		const ctx = {
			host: this as SceneHost,
			document,
			webviewPanel,
			markNotDirty: () => {
				this.isDirty = false;
			},
			getIsProgrammaticChange: () => this.isProgrammaticChange,
			clearProgrammaticChange: () => {
				this.isProgrammaticChange = false;
			},
		};

		webviewPanel.webview.onDidReceiveMessage(async (msg: WebviewToExtensionMessage) => {
			await handleWebviewMessage(msg, ctx);
		});

		const viewStateSub = webviewPanel.onDidChangeViewState(() => {
			if (webviewPanel.active) {
				SceneRegistry.setActiveInstance(this);
				if (this.currentScene) {
					SceneRegistry.emitSceneChange(this.currentScene);
				}
			}
		});

		const changeSub = vscode.workspace.onDidChangeTextDocument((e) => {
			if (e.document.uri.toString() === document.uri.toString()) {
				void sendSceneUpdate(ctx);
			}
		});

		webviewPanel.onDidDispose(() => {
			changeSub.dispose();
			viewStateSub.dispose();
			if (this.autoSaveTimer) {
				clearTimeout(this.autoSaveTimer);
				this.autoSaveTimer = null;
			}
			SceneRegistry.removeInstance(this);
			if (this.activeWebview === webviewPanel.webview) {
				this.activeWebview = null;
			}
			if (this.currentDocument === document) {
				this.currentDocument = null;
			}
		});
	}
}

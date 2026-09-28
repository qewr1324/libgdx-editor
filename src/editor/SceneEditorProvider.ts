import * as vscode from "vscode";
import type { GameObject, Scene } from "../types/scene.js";
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from "../protocol/messages.js";
import { getWebviewHtml } from "./webviewHtml.js";
import { HistoryManager } from "./historyManager.js";
import { SceneRegistry } from "./scene-registry.js";
import { parseDocument, writeDocument } from "./scene-parser.js";
import type { SceneHost } from "./scene-types.js";
import { handleWebviewMessage, sendScene, sendSceneUpdate, type MessageHandlerContext } from "./message-handler.js";
import type { LibGdxEditorConfig } from "../config/config-types.js";

export type { ObjectSelectionHandler, SceneChangeHandler, OpenSceneSettingsHandler } from "./scene-types.js";

/**
 * ✅ State مخصوص هر document — به جای currentScene/currentDocument مشترک.
 */
interface DocumentState {
	document: vscode.TextDocument;
	scene: Scene | null;
	webviews: Set<vscode.Webview>;
	history: HistoryManager;
	isDirty: boolean;
	autoSaveTimer: NodeJS.Timeout | null;
	isProgrammaticChange: boolean;
}

/**
 * ✅ یک host مجزا برای هر document — تا op ها بین فایل‌ها قاطی نشوند.
 */
class DocumentHost implements SceneHost {
	public readonly document: vscode.TextDocument;
	public scene: Scene | null = null;
	public readonly webviews = new Set<vscode.Webview>();
	public readonly history = new HistoryManager();
	public isDirty = false;
	public autoSaveTimer: NodeJS.Timeout | null = null;
	public isProgrammaticChange = false;

	constructor(
		document: vscode.TextDocument,
		private readonly parent: SceneEditorProvider,
	) {
		this.document = document;
	}

	public getScene(): Scene | null {
		return this.scene;
	}
	public setScene(scene: Scene): void {
		this.scene = scene;
	}
	public getDocument(): vscode.TextDocument {
		return this.document;
	}

	public postToWebview(msg: unknown): void {
		for (const webview of this.webviews) {
			try {
				webview.postMessage(msg);
			} catch {
				// ignore
			}
		}
	}

	public postToSpecificWebview(webview: vscode.Webview, msg: unknown): void {
		try {
			webview.postMessage(msg);
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
		if (!this.scene || !this.isDirty) return;

		// چک امنیتی
		const docName = this.document.uri.path.split("/").pop()?.replace(".lgdx.json", "");
		if (docName && this.scene.name !== docName) {
			console.warn(`[DocumentHost] autoSave skip: scene.name (${this.scene.name}) != doc name (${docName})`);
			return;
		}

		try {
			this.isProgrammaticChange = true;
			await writeDocument(this.document, this.scene);
			this.isDirty = false;
		} catch (err) {
			console.error("Auto-save failed:", err);
		} finally {
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
			SceneRegistry.emitSceneChange(this, scene);
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
}

export class SceneEditorProvider implements vscode.CustomTextEditorProvider {
	public static readonly viewType = "libgdx-editor.sceneEditor";

	/** ✅ map document.uri → DocumentHost */
	private hosts = new Map<string, DocumentHost>();

	public static onDidSelectObject(handler: Parameters<typeof SceneRegistry.onDidSelectObject>[0]): vscode.Disposable {
		return SceneRegistry.onDidSelectObject(handler);
	}

	public static onDidChangeScene(handler: Parameters<typeof SceneRegistry.onDidChangeScene>[0]): vscode.Disposable {
		return SceneRegistry.onDidChangeScene(handler);
	}

	public static onDidRequestSceneSettings(handler: Parameters<typeof SceneRegistry.onDidRequestSceneSettings>[0]): vscode.Disposable {
		return SceneRegistry.onDidRequestSceneSettings(handler);
	}

	public static broadcastConfigChange(config: LibGdxEditorConfig): void {
		const instances = SceneRegistry.getInstances();
		for (const inst of instances) {
			try {
				const msg: ExtensionToWebviewMessage = {
					type: "configUpdated",
					config: {
						version: config.version,
						defaultTheme: config.defaultTheme,
						autoSaveDelayMs: config.autoSaveDelayMs,
						showRulers: config.showRulers,
						showGrid: config.showGrid,
						defaultGridSize: config.defaultGridSize,
					},
				};
				inst.postToWebview(msg);
			} catch (err) {
				console.error("[SceneEditorProvider] postMessage failed:", err);
			}
		}
	}

	public static getAllInstances(): SceneHost[] {
		return SceneRegistry.getInstances();
	}

	public static setActiveInstance(instance: SceneHost | null): void {
		SceneRegistry.setActiveInstance(instance);
	}

	/**
	 * ✅ instance فعال را برمی‌گرداند (برای command ها).
	 */
	public static getActiveProvider(): SceneHost | null {
		return SceneRegistry.getActiveInstance();
	}

	constructor(private readonly context: vscode.ExtensionContext) {}

	public static register(context: vscode.ExtensionContext): vscode.Disposable {
		const provider = new SceneEditorProvider(context);
		return vscode.window.registerCustomEditorProvider(SceneEditorProvider.viewType, provider, {
			webviewOptions: { retainContextWhenHidden: true },
			supportsMultipleEditorsPerDocument: false,
		});
	}

	public async resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken): Promise<void> {
		webviewPanel.webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, "dist"), vscode.Uri.joinPath(this.context.extensionUri, "res"), vscode.Uri.joinPath(document.uri, "..")],
		};

		webviewPanel.webview.html = getWebviewHtml(webviewPanel.webview, this.context.extensionUri, "viewport");

		// ✅ host مخصوص این document
		const uriKey = document.uri.toString();
		let host = this.hosts.get(uriKey);
		if (!host) {
			host = new DocumentHost(document, this);
			this.hosts.set(uriKey, host);
			SceneRegistry.addInstance(host);
		}
		host.webviews.add(webviewPanel.webview);

		SceneRegistry.setActiveInstance(host);

		const ctx: MessageHandlerContext = {
			host,
			document,
			webviewPanel,
			markNotDirty: () => {
				host.isDirty = false;
			},
			getIsProgrammaticChange: () => host.isProgrammaticChange,
			clearProgrammaticChange: () => {
				host.isProgrammaticChange = false;
			},
		};

		webviewPanel.webview.onDidReceiveMessage(async (msg: WebviewToExtensionMessage) => {
			await handleWebviewMessage(msg, ctx);
		});

		const viewStateSub = webviewPanel.onDidChangeViewState(() => {
			if (webviewPanel.active) {
				SceneRegistry.setActiveInstance(host);
				if (host.scene) {
					SceneRegistry.emitSceneChange(host, host.scene);
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
			host.webviews.delete(webviewPanel.webview);

			if (host.webviews.size === 0) {
				if (host.autoSaveTimer) {
					clearTimeout(host.autoSaveTimer);
					host.autoSaveTimer = null;
				}
				this.hosts.delete(uriKey);
				SceneRegistry.removeInstance(host);
			}
		});
	}
}

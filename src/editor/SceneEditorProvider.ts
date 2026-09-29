import * as vscode from "vscode";
import type { Scene } from "../types/scene.js";
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from "../protocol/messages.js";
import { toConfigMessage } from "../protocol/messages.js";
import { getWebviewHtml } from "./webviewHtml.js";
import { SceneRegistry } from "./scene-registry.js";
import { HistoryController } from "./historyController.js";
import { parseDocument, writeDocument, saveDocument } from "./scene-parser.js";
import type { SceneHost } from "./scene-types.js";
import { handleWebviewMessage, sendScene, sendSceneUpdate, type MessageHandlerContext } from "./message-handler.js";
import type { LibGdxEditorConfig } from "../config/config-types.js";
import { log } from "../shared/logger.js";

export type { ObjectSelectionHandler, SceneChangeHandler, OpenSceneSettingsHandler } from "./scene-types.js";

const AUTOSAVE_MIN_DELAY_MS = 1500;
const AUTOSAVE_MAX_DELAY_MS = 5000;
const AUTOSAVE_DELAY_PER_CHANGE_MS = 100;

class DocumentHost implements SceneHost {
	public readonly document: vscode.TextDocument;
	public scene: Scene | null = null;
	public readonly webviews = new Set<vscode.Webview>();
	public isDirty = false;
	public autoSaveTimer: NodeJS.Timeout | null = null;
	public programmaticChangeUntil = 0;

	private pendingChanges = 0;
	private readonly historyController: HistoryController;

	constructor(document: vscode.TextDocument) {
		this.document = document;
		this.historyController = new HistoryController(this);
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

	public markDirty(): void {
		this.isDirty = true;
		this.pendingChanges++;

		if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);

		const delay = Math.min(AUTOSAVE_MAX_DELAY_MS, AUTOSAVE_MIN_DELAY_MS + this.pendingChanges * AUTOSAVE_DELAY_PER_CHANGE_MS);

		log.debug(`[DocumentHost] markDirty (pending=${this.pendingChanges}, delay=${delay}ms)`);

		this.autoSaveTimer = setTimeout(() => {
			void this.autoSave();
		}, delay);
	}

	public async autoSave(): Promise<void> {
		if (!this.scene || !this.isDirty) return;

		const docName = this.document.uri.path.split("/").pop()?.replace(".lgdx.json", "");
		if (docName && this.scene.name !== docName) {
			log.warn(`[DocumentHost] autoSave skip: scene.name (${this.scene.name}) != doc name (${docName})`);
			return;
		}

		this.markProgrammaticChange(300);
		try {
			await writeDocument(this.document, this.scene);
			await saveDocument(this.document);
			this.isDirty = false;
			this.pendingChanges = 0;
			log.debug(`[DocumentHost] autoSaved: ${this.document.uri.fsPath}`);
		} catch (err) {
			log.error("[DocumentHost] autoSave failed:", err);
		}
	}

	public markProgrammaticChange(durationMs: number): void {
		const until = Date.now() + durationMs;
		if (until > this.programmaticChangeUntil) {
			this.programmaticChangeUntil = until;
		}
	}
	public isProgrammaticChange(): boolean {
		return Date.now() < this.programmaticChangeUntil;
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
			canUndo: this.historyController.canUndo(),
			canRedo: this.historyController.canRedo(),
		} satisfies ExtensionToWebviewMessage);
	}

	public isActive(): boolean {
		return SceneRegistry.isActive(this);
	}

	public getHistory(): HistoryController {
		return this.historyController;
	}
}

export class SceneEditorProvider implements vscode.CustomTextEditorProvider {
	public static readonly viewType = "libgdx-editor.sceneEditor";

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
		const msg: ExtensionToWebviewMessage = {
			type: "configUpdated",
			config: toConfigMessage(config),
		};
		for (const inst of SceneRegistry.getInstances()) {
			try {
				inst.postToWebview(msg);
			} catch (err) {
				log.error("[SceneEditorProvider] postMessage failed:", err);
			}
		}
	}

	public static getAllInstances(): SceneHost[] {
		return SceneRegistry.getInstances();
	}

	public static setActiveInstance(instance: SceneHost | null): void {
		SceneRegistry.setActiveInstance(instance);
	}

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

		const uriKey = document.uri.toString();
		let host = this.hosts.get(uriKey);
		if (!host) {
			host = new DocumentHost(document);
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
			getIsProgrammaticChange: () => host.isProgrammaticChange(),
			setProgrammaticChange: (value: boolean) => {
				if (value) {
					host.markProgrammaticChange(300);
				} else {
					host.programmaticChangeUntil = 0;
				}
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
				host.getHistory().clear();
				this.hosts.delete(uriKey);
				SceneRegistry.removeInstance(host);
			}
		});
	}
}

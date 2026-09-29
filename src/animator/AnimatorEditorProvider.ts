import * as vscode from "vscode";
import { getAnimatorWebviewHtml } from "./webviewHtml.js";
import { parseAnimationDocument, writeAnimationDocument, saveAnimationDocument } from "./animatorParser.js";
import { DEFAULT_ANIMATION, type Animation } from "./animatorConfig.js";
import { AssetManager } from "../editor/assetManager.js";
import { log } from "../shared/logger.js";
import type { AnimatorMessageFromWebview, AnimatorMessageToWebview } from "../webview/animator/protocol.js";

interface AnimatorDocumentState {
	document: vscode.TextDocument;
	webviews: Set<vscode.Webview>;
	animation: Animation | null;
	isDirty: boolean;
	autoSaveTimer: NodeJS.Timeout | null;
	programmaticChangeUntil: number;
	currentSceneUri: vscode.Uri | null;
}

export class AnimatorEditorProvider implements vscode.CustomTextEditorProvider {
	public static readonly viewType = "libgdx-editor.animatorEditor";

	private static instance: AnimatorEditorProvider | null = null;
	private states = new Map<string, AnimatorDocumentState>();

	public static register(context: vscode.ExtensionContext): vscode.Disposable {
		const provider = new AnimatorEditorProvider(context);
		AnimatorEditorProvider.instance = provider;
		return vscode.window.registerCustomEditorProvider(AnimatorEditorProvider.viewType, provider, {
			webviewOptions: { retainContextWhenHidden: true },
			supportsMultipleEditorsPerDocument: false,
		});
	}

	public static getActive(): AnimatorEditorProvider | null {
		return AnimatorEditorProvider.instance;
	}

	constructor(private readonly context: vscode.ExtensionContext) {}

	public async resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken): Promise<void> {
		webviewPanel.webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, "dist"), vscode.Uri.joinPath(this.context.extensionUri, "res"), vscode.Uri.joinPath(document.uri, "..")],
		};

		webviewPanel.webview.html = getAnimatorWebviewHtml(webviewPanel.webview, this.context.extensionUri);

		const uriKey = document.uri.toString();
		let state = this.states.get(uriKey);
		if (!state) {
			state = {
				document,
				webviews: new Set(),
				animation: null,
				isDirty: false,
				autoSaveTimer: null,
				programmaticChangeUntil: 0,
				currentSceneUri: null,
			};
			this.states.set(uriKey, state);
		}
		state.webviews.add(webviewPanel.webview);

		const ctx = {
			state,
			document,
			webviewPanel,
			host: this,
		};

		webviewPanel.webview.onDidReceiveMessage(async (msg: AnimatorMessageFromWebview) => {
			await this.handleMessage(msg, ctx);
		});

		const changeSub = vscode.workspace.onDidChangeTextDocument((e) => {
			if (e.document.uri.toString() === document.uri.toString()) {
				if (Date.now() < state.programmaticChangeUntil) return;
				this.onDocumentChanged(ctx);
			}
		});

		webviewPanel.onDidDispose(() => {
			changeSub.dispose();
			state.webviews.delete(webviewPanel.webview);

			if (state.webviews.size === 0) {
				if (state.autoSaveTimer) {
					clearTimeout(state.autoSaveTimer);
					state.autoSaveTimer = null;
				}
				this.states.delete(uriKey);
			}
		});
	}

	// ============================================================
	// Message handling
	// ============================================================

	private async handleMessage(msg: AnimatorMessageFromWebview, ctx: any): Promise<void> {
		switch (msg.type) {
			case "ready":
				await this.sendLoad(ctx);
				break;
			case "save":
				await this.save(ctx, msg.animation);
				break;
			case "updateAnimation":
				this.updateAnimation(ctx, msg.animation, msg.historyLabel ?? "edit");
				break;
			case "updateMetadata":
				this.updateMetadata(ctx, msg.patch);
				break;
			case "requestScene":
				await this.sendScene(ctx, msg.sceneName);
				break;
			case "requestSceneList":
				await this.sendSceneList(ctx);
				break;
			case "requestObjectList":
				await this.sendObjectList(ctx, msg.sceneName);
				break;
			case "changeSourceScene":
				await this.changeSourceScene(ctx, msg.sceneName);
				break;
		}
	}

	private markDirty(ctx: any): void {
		ctx.state.isDirty = true;
		if (ctx.state.autoSaveTimer) clearTimeout(ctx.state.autoSaveTimer);
		ctx.state.autoSaveTimer = setTimeout(() => {
			void this.autoSave(ctx);
		}, 2000);
	}

	private async autoSave(ctx: any): Promise<void> {
		if (!ctx.state.animation || !ctx.state.isDirty) return;
		ctx.state.programmaticChangeUntil = Date.now() + 300;
		try {
			await writeAnimationDocument(ctx.document, ctx.state.animation);
			await saveAnimationDocument(ctx.document);
			ctx.state.isDirty = false;
		} catch (err) {
			log.error("[Animator] autoSave failed:", err);
		}
	}

	private async save(ctx: any, animation: Animation): Promise<void> {
		ctx.state.animation = animation;
		ctx.state.programmaticChangeUntil = Date.now() + 300;
		await writeAnimationDocument(ctx.document, animation);
		await saveAnimationDocument(ctx.document);
		ctx.state.isDirty = false;
	}

	private updateAnimation(ctx: any, animation: Animation, _label: string): void {
		ctx.state.animation = animation;
		this.markDirty(ctx);
	}

	private updateMetadata(ctx: any, patch: Partial<Animation>): void {
		if (!ctx.state.animation) return;
		ctx.state.animation = { ...ctx.state.animation, ...patch };
		this.markDirty(ctx);
	}

	// ============================================================
	// Sending to webview
	// ============================================================

	private async sendLoad(ctx: any): Promise<void> {
		const animation = parseAnimationDocument(ctx.document);
		ctx.state.animation = animation;

		this.postToAllWebviews(ctx.state, {
			type: "loadAnimation",
			animation,
			filePath: ctx.document.uri.fsPath,
		});

		await this.sendSceneList(ctx);
		if (animation.sourceScene) {
			await this.sendScene(ctx, animation.sourceScene);
		}
	}

	private async sendSceneList(ctx: any): Promise<void> {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (!workspaceFolder) {
			this.postToAllWebviews(ctx.state, { type: "sceneList", scenes: [] });
			return;
		}

		const scenes = await vscode.workspace.findFiles("**/*.lgdx.json", "**/node_modules/**", 200);
		const list = scenes.map((uri) => ({
			name: vscode.workspace.asRelativePath(uri),
			uri: uri.toString(),
		}));

		this.postToAllWebviews(ctx.state, { type: "sceneList", scenes: list });
	}

	private async sendScene(ctx: any, sceneName: string): Promise<void> {
		try {
			const sceneUri = await this.resolveSceneUri(sceneName);
			if (!sceneUri) {
				this.postToAllWebviews(ctx.state, { type: "sceneError", message: `Scene not found: ${sceneName}` });
				return;
			}
			const doc = await vscode.workspace.openTextDocument(sceneUri);
			const scene = JSON.parse(doc.getText());

			const objects = this.collectObjects(scene);

			ctx.state.currentSceneUri = sceneUri;

			this.postToAllWebviews(ctx.state, {
				type: "sceneLoaded",
				sceneName,
				sceneUri: sceneUri.toString(),
				scene,
				objects,
			});

			// ✅ لود کردن texture ها به عنوان data URL و فرستادن به webview
			try {
				const textures = await AssetManager.loadTexturesAsDataUrls(sceneUri, scene);
				this.postToAllWebviews(ctx.state, {
					type: "texturesLoaded",
					textures,
				});
			} catch (err) {
				log.error("[Animator] loadTextures failed:", err);
			}
		} catch (err) {
			log.error("[Animator] sendScene failed:", err);
			this.postToAllWebviews(ctx.state, {
				type: "sceneError",
				message: err instanceof Error ? err.message : String(err),
			});
		}
	}

	private async sendObjectList(ctx: any, sceneName: string): Promise<void> {
		try {
			const sceneUri = await this.resolveSceneUri(sceneName);
			if (!sceneUri) return;
			const doc = await vscode.workspace.openTextDocument(sceneUri);
			const scene = JSON.parse(doc.getText());
			const objects = this.collectObjects(scene);
			this.postToAllWebviews(ctx.state, {
				type: "objectList",
				objects,
			});
		} catch (err) {
			log.error("[Animator] sendObjectList failed:", err);
		}
	}

	private async changeSourceScene(ctx: any, sceneName: string): Promise<void> {
		if (!ctx.state.animation) return;
		ctx.state.animation.sourceScene = sceneName;
		this.markDirty(ctx);
		await this.sendScene(ctx, sceneName);
		this.postToAllWebviews(ctx.state, {
			type: "animationUpdated",
			animation: ctx.state.animation,
		});
	}

	private onDocumentChanged(ctx: any): void {
		try {
			const animation = parseAnimationDocument(ctx.document);
			ctx.state.animation = animation;
			this.postToAllWebviews(ctx.state, {
				type: "animationUpdated",
				animation,
			});
		} catch (err) {
			log.error("[Animator] onDocumentChanged failed:", err);
		}
	}

	// ============================================================
	// Helpers
	// ============================================================

	private postToAllWebviews(state: AnimatorDocumentState, msg: AnimatorMessageToWebview): void {
		for (const webview of state.webviews) {
			try {
				webview.postMessage(msg);
			} catch {
				// ignore
			}
		}
	}

	private collectObjects(scene: any): Array<{ id: string; name: string; type: string; zIndex: number; texture?: string }> {
		const result: Array<{ id: string; name: string; type: string; zIndex: number; texture?: string }> = [];
		if (!scene?.layers) return result;
		for (const layer of scene.layers) {
			for (const obj of layer.objects ?? []) {
				result.push({
					id: obj.id,
					name: obj.name ?? obj.id,
					type: obj.type ?? "sprite",
					zIndex: obj.zIndex ?? 0,
					texture: obj.texture,
				});
			}
		}
		return result;
	}

	private async resolveSceneUri(sceneName: string): Promise<vscode.Uri | null> {
		// اگر URI کامل باشه
		if (sceneName.startsWith("file:")) {
			try {
				return vscode.Uri.parse(sceneName);
			} catch {
				// ignore
			}
		}

		// اگر نام نسبی باشه
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (workspaceFolder) {
			try {
				const found = await vscode.workspace.findFiles(`**/${sceneName}`, "**/node_modules/**", 1);
				if (found.length > 0) return found[0];
			} catch {
				// ignore
			}
		}

		// در نهایت، کنار خود فایل انیمیشن بگرد
		const workspaceFolderLocal = vscode.workspace.workspaceFolders?.[0];
		if (workspaceFolderLocal) {
			const candidate = vscode.Uri.joinPath(workspaceFolderLocal.uri, sceneName);
			try {
				await vscode.workspace.fs.stat(candidate);
				return candidate;
			} catch {
				// ignore
			}
		}

		return null;
	}
}

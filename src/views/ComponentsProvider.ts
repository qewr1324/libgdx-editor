// src/views/ComponentsProvider.ts
import * as vscode from "vscode";
import type { GameObject, Scene } from "../types/scene.js";
import type { Component, ComponentType } from "../types/components.js";
import { getWebviewHtml } from "../editor/webviewHtml.js";
import { toConfigMessage, type ExtensionToComponentsMessage } from "../protocol/messages.js";
import type { LibGdxEditorConfig } from "../config/config-types.js";
import { ConfigManager } from "../config/config-manager.js";
import type { SceneHost } from "../editor/scene-types.js";
import { AtlasImporter } from "../features/texture-atlas/atlas-importer.js";
import { log } from "../shared/logger.js";
import { handleAddComponent, handleUpdateComponent, handleRemoveComponent, handleReplaceComponent } from "../editor/message-handler.js";

export class ComponentsProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = "libgdx-editor.components";

	private view: vscode.WebviewView | null = null;
	private currentScene: Scene | null = null;
	private selectedIds: string[] = [];
	private boundHost: SceneHost | null = null;
	private currentDocumentUri: vscode.Uri | null = null;

	constructor(private readonly extensionUri: vscode.Uri) {}

	public broadcastConfigChange(config: LibGdxEditorConfig): void {
		if (!this.view) return;
		try {
			this.view.webview.postMessage({
				type: "configUpdated",
				config: toConfigMessage(config),
			} satisfies ExtensionToComponentsMessage);
		} catch (err) {
			console.error("[ComponentsProvider] broadcastConfigChange failed:", err);
		}
	}

	public resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken): void {
		this.view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "dist"), vscode.Uri.joinPath(this.extensionUri, "res")],
		};

		webviewView.webview.html = getWebviewHtml(webviewView.webview, this.extensionUri, "components");

		webviewView.webview.onDidReceiveMessage(async (msg) => {
			switch (msg.type) {
				case "componentsReady":
					this.pushSelectionToWebview();
					break;

				case "addComponent":
					if (this.boundHost) {
						handleAddComponent(this.boundHost, msg.objectId, msg.componentType as ComponentType);
					}
					break;

				case "updateComponent":
					if (this.boundHost) {
						handleUpdateComponent(this.boundHost, msg.objectId, msg.componentId, msg.updates as Partial<Component>);
					}
					break;

				case "removeComponent":
					if (this.boundHost) {
						handleRemoveComponent(this.boundHost, msg.objectId, msg.componentId);
					}
					break;

				case "replaceComponent":
					if (this.boundHost) {
						handleReplaceComponent(this.boundHost, msg.objectId, msg.component as Component);
					}
					break;

				case "updateConfig": {
					const config = ConfigManager.getInstance();
					await config.set(msg.key as keyof LibGdxEditorConfig, msg.value as never);
					break;
				}

				case "updateConfigPartial": {
					const config = ConfigManager.getInstance();
					await config.update(msg.partial as never);
					break;
				}

				case "requestConfig": {
					const config = ConfigManager.getInstance().get();
					this.view?.webview.postMessage({
						type: "configLoaded",
						config: toConfigMessage(config),
					} satisfies ExtensionToComponentsMessage);
					break;
				}

				case "requestAtlasRegions": {
					if (!this.currentDocumentUri) break;
					try {
						const atlas = await AtlasImporter.loadAtlasRegions(this.currentDocumentUri, msg.texturePath);
						if (atlas) {
							this.view?.webview.postMessage({
								type: "atlasRegionsLoaded",
								texturePath: msg.texturePath,
								atlasPath: atlas.atlasPath,
								regions: atlas.regions.map((r) => ({
									name: r.name,
									x: r.x,
									y: r.y,
									width: r.width,
									height: r.height,
									rotate: r.rotate,
									index: r.index,
								})),
							} satisfies ExtensionToComponentsMessage);
						} else {
							this.view?.webview.postMessage({
								type: "atlasNotFound",
								texturePath: msg.texturePath,
							} satisfies ExtensionToComponentsMessage);
						}
					} catch (err) {
						log.error("[ComponentsProvider] requestAtlasRegions failed:", err);
						this.view?.webview.postMessage({
							type: "atlasNotFound",
							texturePath: msg.texturePath,
						} satisfies ExtensionToComponentsMessage);
					}
					break;
				}
			}
		});

		this.pushSelectionToWebview();
	}

	public setSelection(host: SceneHost, objectIds: string[], scene: Scene): void {
		this.boundHost = host;
		this.selectedIds = objectIds;
		this.currentScene = scene;
		this.currentDocumentUri = host.getDocument()?.uri ?? null;
		this.pushSelectionToWebview();
	}

	public setScene(host: SceneHost, scene: Scene): void {
		if (this.boundHost && this.boundHost !== host) {
			return;
		}
		this.boundHost = host;
		this.currentScene = scene;
		this.currentDocumentUri = host.getDocument()?.uri ?? null;
		this.pushSelectionToWebview();
	}

	public clearSelection(host: SceneHost): void {
		if (this.boundHost && this.boundHost !== host) return;
		this.selectedIds = [];
		this.pushSelectionToWebview();
	}

	private pushSelectionToWebview(): void {
		if (!this.view) return;

		if (this.selectedIds.length === 0 || !this.currentScene) {
			this.view.webview.postMessage({ type: "clearSelection" } satisfies ExtensionToComponentsMessage);
			return;
		}

		if (this.selectedIds.length === 1) {
			const obj = this.findObject(this.currentScene, this.selectedIds[0]);
			if (obj) {
				this.view.webview.postMessage({ type: "showObject", object: obj } satisfies ExtensionToComponentsMessage);
			} else {
				this.view.webview.postMessage({ type: "clearSelection" } satisfies ExtensionToComponentsMessage);
			}
		} else {
			this.view.webview.postMessage({
				type: "showMultiSelection",
				count: this.selectedIds.length,
				ids: this.selectedIds,
			} satisfies ExtensionToComponentsMessage);
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

// src/features/layers/LayersProvider.ts
import * as vscode from "vscode";
import type { Layer, Scene } from "../../types/scene.js";
import { getWebviewHtml } from "../../editor/webviewHtml.js";
import type { ExtensionToLayersMessage } from "../../protocol/messages.js";
import { SceneRegistry } from "../../editor/scene-registry.js";
import type { SceneHost } from "../../editor/scene-types.js";
import { addLayerOp, deleteLayerOp, moveLayerDownOp, moveLayerUpOp, renameLayerOp, reorderLayersOp, toggleLayerLockOp, toggleLayerVisibilityOp } from "./layer-ops.js";
import { log } from "../../shared/logger.js";

export class LayersProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = "libgdx-editor.layers";

	private view: vscode.WebviewView | null = null;
	private boundHost: SceneHost | null = null;
	private selectedLayer: string | null = null;
	private disposables: vscode.Disposable[] = [];

	constructor(private readonly extensionUri: vscode.Uri) {}

	public resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken): void {
		this.view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "dist"), vscode.Uri.joinPath(this.extensionUri, "res")],
		};

		webviewView.webview.html = getWebviewHtml(webviewView.webview, this.extensionUri, "layers");

		webviewView.webview.onDidReceiveMessage((msg) => this.handleMessage(msg));

		this.disposables.push(
			SceneRegistry.onDidChangeScene((host, scene) => {
				if (host !== this.boundHost) return;
				this.pushLayers(scene);
			}),
		);

		this.disposables.push(
			SceneRegistry.onDidChangeActiveInstance((instance) => {
				if (!instance) {
					this.boundHost = null;
					this.pushLayers(null);
					return;
				}
				this.boundHost = instance;
				const scene = instance.getScene();
				if (scene) this.pushLayers(scene);
			}),
		);

		const active = SceneRegistry.getActiveInstance();
		if (active) {
			this.boundHost = active;
			const scene = active.getScene();
			if (scene) this.pushLayers(scene);
		} else {
			this.pushLayers(null);
		}
	}

	private handleMessage(msg: any): void {
		const host = this.boundHost;
		if (!host && !["layersReady", "selectLayer"].includes(msg.type)) return;

		switch (msg.type) {
			case "layersReady": {
				const scene = host?.getScene() ?? null;
				this.pushLayers(scene);
				break;
			}
			case "selectLayer":
				// 🆕 همیشه با name مقایسه کن
				this.selectedLayer = msg.name;
				this.pushLayers(host!.getScene());
				break;
			case "addLayer": {
				// 🆕 addLayerOp مقدار name رو برمی‌گردونه (نه id)
				const newName = addLayerOp(host!);
				if (newName) this.selectedLayer = newName;
				break;
			}
			case "deleteLayer":
				deleteLayerOp(host!, msg.name);
				if (this.selectedLayer === msg.name) this.selectedLayer = null;
				break;
			case "renameLayer":
				renameLayerOp(host!, msg.oldName, msg.newName);
				if (this.selectedLayer === msg.oldName) this.selectedLayer = msg.newName;
				break;
			case "toggleLayerVisibility":
				toggleLayerVisibilityOp(host!, msg.name);
				break;
			case "toggleLayerLock":
				toggleLayerLockOp(host!, msg.name);
				break;
			case "moveLayerUp":
				moveLayerUpOp(host!, msg.name);
				break;
			case "moveLayerDown":
				moveLayerDownOp(host!, msg.name);
				break;
			case "reorderLayers":
				reorderLayersOp(host!, msg.fromIndex, msg.toIndex);
				break;
		}
	}

	private pushLayers(scene: Scene | null): void {
		if (!this.view) return;

		const layers: Layer[] = scene?.layers ?? [];

		if (this.selectedLayer && !layers.some((l) => l.name === this.selectedLayer)) {
			this.selectedLayer = null;
		}

		const msg: ExtensionToLayersMessage = {
			type: "showLayers",
			layers,
			selectedLayer: this.selectedLayer,
		};
		this.view.webview.postMessage(msg);
	}

	public dispose(): void {
		for (const d of this.disposables) d.dispose();
		this.disposables = [];
	}
}

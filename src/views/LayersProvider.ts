import * as vscode from "vscode";
import type { Layer } from "../types/scene.js";
import { getWebviewHtml } from "../editor/webviewHtml.js";
import type { ExtensionToLayersMessage } from "../protocol/messages.js";

export class LayersProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = "libgdx-editor.layers";

	private view: vscode.WebviewView | null = null;
	private layers: Layer[] = [];
	private selectedLayer: string | null = null;

	private onAddLayer: (() => void) | null = null;
	private onDeleteLayer: ((name: string) => void) | null = null;
	private onToggleVisibility: ((name: string) => void) | null = null;
	private onToggleLock: ((name: string) => void) | null = null;
	private onRenameLayer: ((oldName: string, newName: string) => void) | null = null;
	private onMoveUp: ((name: string) => void) | null = null;
	private onMoveDown: ((name: string) => void) | null = null;

	constructor(private readonly extensionUri: vscode.Uri) {}

	public setHandlers(handlers: {
		onAddLayer: () => void;
		onDeleteLayer: (name: string) => void;
		onToggleVisibility: (name: string) => void;
		onToggleLock: (name: string) => void;
		onRenameLayer: (oldName: string, newName: string) => void;
		onMoveUp: (name: string) => void;
		onMoveDown: (name: string) => void;
	}): void {
		this.onAddLayer = handlers.onAddLayer;
		this.onDeleteLayer = handlers.onDeleteLayer;
		this.onToggleVisibility = handlers.onToggleVisibility;
		this.onToggleLock = handlers.onToggleLock;
		this.onRenameLayer = handlers.onRenameLayer;
		this.onMoveUp = handlers.onMoveUp;
		this.onMoveDown = handlers.onMoveDown;
	}

	resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken): void {
		this.view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "dist"), vscode.Uri.joinPath(this.extensionUri, "res")],
		};

		webviewView.webview.html = getWebviewHtml(webviewView.webview, this.extensionUri, "layers");

		webviewView.webview.onDidReceiveMessage((msg) => {
			switch (msg.type) {
				case "layersReady":
					this.pushLayers();
					break;
				case "addLayer":
					this.onAddLayer?.();
					break;
				case "deleteLayer":
					this.onDeleteLayer?.(msg.name);
					break;
				case "toggleLayerVisibility":
					this.onToggleVisibility?.(msg.name);
					break;
				case "toggleLayerLock":
					this.onToggleLock?.(msg.name);
					break;
				case "renameLayer":
					this.onRenameLayer?.(msg.oldName, msg.newName);
					break;
				case "moveLayerUp":
					this.onMoveUp?.(msg.name);
					break;
				case "moveLayerDown":
					this.onMoveDown?.(msg.name);
					break;
				case "selectLayer":
					this.selectedLayer = msg.name;
					this.pushLayers();
					break;
			}
		});

		this.pushLayers();
	}

	setLayers(layers: Layer[]): void {
		this.layers = layers;
		this.pushLayers();
	}

	private pushLayers(): void {
		if (!this.view) return;
		const msg: ExtensionToLayersMessage = {
			type: "showLayers",
			layers: this.layers,
			selectedLayer: this.selectedLayer,
		};
		this.view.webview.postMessage(msg);
	}
}

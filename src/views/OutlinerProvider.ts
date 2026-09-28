import * as vscode from "vscode";
import type { GameObject, Layer, Scene } from "../types/scene.js";

export class OutlinerItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly kind: "layer" | "object",
		public readonly id: string,
		public readonly data?: Layer | GameObject,
	) {
		super(label, collapsibleState);

		this.contextValue = kind;

		if (kind === "layer") {
			this.iconPath = new vscode.ThemeIcon("layers");
		} else {
			const obj = data as GameObject;
			this.iconPath = new vscode.ThemeIcon(obj.type === "sprite" ? "file-media" : obj.type === "shape" ? "symbol-misc" : obj.type === "text" ? "symbol-string" : "folder");
		}
	}
}

export class OutlinerProvider implements vscode.TreeDataProvider<OutlinerItem> {
	private _onDidChangeTreeData = new vscode.EventEmitter<OutlinerItem | undefined | void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	private scene: Scene | null = null;

	setScene(scene: Scene | null): void {
		this.scene = scene;
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: OutlinerItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: OutlinerItem): OutlinerItem[] {
		if (!this.scene) {
			return [];
		}

		if (!element) {
			// سطح اول: لیست layerها
			return this.scene.layers.map((layer) => new OutlinerItem(layer.name, layer.objects.length > 0 ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None, "layer", layer.name, layer));
		}

		if (element.kind === "layer") {
			const layer = element.data as Layer;
			return layer.objects.map((obj) => new OutlinerItem(obj.name, obj.children && obj.children.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None, "object", obj.id, obj));
		}

		if (element.kind === "object") {
			const obj = element.data as GameObject;
			if (obj.children) {
				return obj.children.map((child) => new OutlinerItem(child.name, child.children && child.children.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None, "object", child.id, child));
			}
		}

		return [];
	}

	getParent(element: OutlinerItem): OutlinerItem | undefined {
		if (!this.scene || element.kind === "layer") {
			return undefined;
		}
		// جستجوی والد در همه layerها
		for (const layer of this.scene.layers) {
			const parent = this.findParent(layer.objects, element.id);
			if (parent) {
				return new OutlinerItem(layer.name, vscode.TreeItemCollapsibleState.Expanded, "layer", layer.name, layer);
			}
		}
		return undefined;
	}

	private findParent(objects: GameObject[], id: string): GameObject | null {
		for (const obj of objects) {
			if (obj.children) {
				for (const child of obj.children) {
					if (child.id === id) {
						return obj;
					}
				}
				const found = this.findParent(obj.children, id);
				if (found) {
					return found;
				}
			}
		}
		return null;
	}
}

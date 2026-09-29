// src/editor/scene-parser.ts
import * as vscode from "vscode";
import { createEmptyScene, type Layer, type Scene } from "../types/scene.js";

export function parseDocument(document: vscode.TextDocument): Scene {
	const text = document.getText();
	if (!text.trim()) {
		return createEmptyScene(document.uri.path.split("/").pop()?.replace(".lgdx.json", "") ?? "untitled");
	}
	try {
		const parsed = JSON.parse(text) as Scene;
		return migrateScene(parsed);
	} catch {
		vscode.window.showErrorMessage("فایل صحنه معتبر نیست. یک صحنه خالی ساخته می‌شود.");
		return createEmptyScene();
	}
}

export function migrateScene(parsed: Scene): Scene {
	if (!parsed.theme) parsed.theme = "win98";
	if (parsed.themeOverride === undefined) parsed.themeOverride = null;
	if (!parsed.camera) parsed.camera = { x: 0, y: 0, zoom: 1 };
	if (typeof parsed.snapToGrid !== "boolean") parsed.snapToGrid = false;
	if (typeof parsed.snapToObjects !== "boolean") parsed.snapToObjects = false;

	if (!Array.isArray(parsed.layers) || parsed.layers.length === 0) {
		parsed.layers = [
			{
				id: "layer_default",
				name: "default",
				zIndex: 0,
				visible: true,
				locked: false,
				objects: [],
			},
		];
	}

	for (let i = 0; i < parsed.layers.length; i++) {
		const layer = parsed.layers[i];
		if (!layer.id) {
			layer.id = `layer_${i}_${(layer.name || "layer").replace(/[^a-z0-9]/gi, "_")}`;
		}
		if (typeof layer.visible !== "boolean") layer.visible = true;
		if (typeof layer.locked !== "boolean") layer.locked = false;
		if (typeof layer.zIndex !== "number") layer.zIndex = i;
		if (!Array.isArray(layer.objects)) layer.objects = [];

		// برای هر آبجکت، layerId رو ست کن اگه نبود
		for (const obj of layer.objects) {
			if (!obj.layerId) {
				obj.layerId = layer.id;
			}
		}
	}

	return parsed;
}

export async function writeDocument(document: vscode.TextDocument, scene: Scene): Promise<void> {
	const edit = new vscode.WorkspaceEdit();
	const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
	edit.replace(document.uri, fullRange, JSON.stringify(scene, null, 2));
	await vscode.workspace.applyEdit(edit);
}

export async function saveDocument(document: vscode.TextDocument): Promise<void> {
	if (document.isDirty) {
		await document.save();
	}
}

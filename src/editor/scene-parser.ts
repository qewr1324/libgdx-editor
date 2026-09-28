import * as vscode from "vscode";
import { createEmptyScene, type Scene } from "../types/scene.js";

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
	// ✅ migrate themeOverride — باگ ۲۶ رفع شد
	if (parsed.themeOverride === undefined) parsed.themeOverride = null;
	if (!parsed.camera) parsed.camera = { x: 0, y: 0, zoom: 1 };
	if (typeof parsed.snapToGrid !== "boolean") parsed.snapToGrid = false;
	if (typeof parsed.snapToObjects !== "boolean") parsed.snapToObjects = false;
	for (const layer of parsed.layers) {
		if (typeof layer.visible !== "boolean") layer.visible = true;
		if (typeof layer.locked !== "boolean") layer.locked = false;
	}
	return parsed;
}

export async function writeDocument(document: vscode.TextDocument, scene: Scene): Promise<void> {
	const edit = new vscode.WorkspaceEdit();
	const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
	edit.replace(document.uri, fullRange, JSON.stringify(scene, null, 2));
	await vscode.workspace.applyEdit(edit);
	await document.save();
}

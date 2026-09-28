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

/**
 * محتوای scene را در document می‌نویسد.
 * - فقط applyEdit می‌کند (نه save) — چون:
 *   1) applyEdit خودش تغییر را در editor اعمال می‌کند
 *   2) save() ممکن است روی فایل اشتباه اثر بگذارد اگر document عوض شده باشد
 *   3) ذخیره‌ی واقعی به عهده‌ی caller است
 *
 * ⚠️ مهم: قبل از فراخوانی، caller باید isProgrammaticChange را true کند
 * تا onDidChangeTextDocument trigger نشود.
 */
export async function writeDocument(document: vscode.TextDocument, scene: Scene): Promise<void> {
	const edit = new vscode.WorkspaceEdit();
	const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
	edit.replace(document.uri, fullRange, JSON.stringify(scene, null, 2));
	await vscode.workspace.applyEdit(edit);
}

/**
 * فقط ذخیره می‌کند (بدون تغییر محتوا).
 */
export async function saveDocument(document: vscode.TextDocument): Promise<void> {
	if (document.isDirty) {
		await document.save();
	}
}

// src/editor/scene-parser.ts
import * as vscode from "vscode";
import { createEmptyScene, type GameObject, type Scene } from "../types/scene.js";
import { createComponentId, type Component } from "../types/components.js";
import type { ShapeType } from "../types/components.js";

// ============================================================
// Parse
// ============================================================

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

// ============================================================
// Migration
// ============================================================

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

		for (const obj of layer.objects) {
			if (!obj.layerId) {
				obj.layerId = layer.id;
			}
			migrateObjectToComponents(obj);
			if (Array.isArray(obj.children)) {
				for (const child of obj.children) {
					migrateObjectToComponents(child);
				}
			}
		}
	}

	return parsed;
}

/**
 * مهاجرت آبجکت‌های قدیمی به سیستم components.
 *
 * قوانین:
 *   - اگه components داشت، فقط type رو gameobject کن
 *   - sprite قدیمی با texture → SpriteComponent
 *   - shape قدیمی → ShapeComponent
 *   - text قدیمی → TextComponent
 *   - properties.atlas قدیمی → AtlasComponent
 */
function migrateObjectToComponents(obj: GameObject): void {
	// اگه از قبل components داره، فقط type رو اصلاح کن
	if (obj.components && obj.components.length > 0) {
		if (obj.type !== "gameobject" && obj.type !== "group") {
			obj.type = "gameobject";
		}
		return;
	}

	const components: Component[] = [];

	// ---------- sprite ----------
	if (obj.type === "sprite") {
		// اگه properties.atlas داشت، به AtlasComponent تبدیل کن
		if (obj.properties?.atlas) {
			const atlas = obj.properties.atlas as {
				atlasPath?: string;
				texturePath?: string;
				selectedRegion?: string;
				regionName?: string;
			};
			components.push({
				id: createComponentId(),
				type: "atlas",
				texture: obj.texture ?? atlas.texturePath ?? "",
				atlasPath: atlas.atlasPath ?? "",
				region: atlas.selectedRegion ?? atlas.regionName ?? "",
				tint: "#ffffff",
			});
		} else {
			// sprite ساده
			components.push({
				id: createComponentId(),
				type: "sprite",
				texture: obj.texture ?? "",
				tint: "#ffffff",
			});
		}
	}

	// ---------- shape ----------
	if (obj.type === "shape") {
		const shapeType = (obj.properties?.shapeType as ShapeType | undefined) ?? "rectangle";
		components.push({
			id: createComponentId(),
			type: "shape",
			shape: shapeType,
			color: obj.color ?? "#4a9eff",
			filled: true,
			strokeWidth: 1,
		});
	}

	// ---------- text ----------
	if (obj.type === "text") {
		components.push({
			id: createComponentId(),
			type: "text",
			text: obj.name,
			color: obj.color ?? "#ffffff",
			fontSize: 16,
		});
	}

	obj.components = components;

	// type رو به gameobject تغییر بده (به‌جز group)
	if (obj.type !== "group") {
		obj.type = "gameobject";
	}
}

// ============================================================
// Write / Save
// ============================================================

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

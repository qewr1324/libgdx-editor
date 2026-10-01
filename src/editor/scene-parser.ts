// src/editor/scene-parser.ts
import * as vscode from "vscode";
import { createEmptyScene, type GameObject, type Scene } from "../types/scene.js";
import { createComponentId, type Component } from "../types/components.js";
import type { ShapeType } from "../types/components.js";
import { normalizeAtlasProperties, type AtlasProperties } from "../features/texture-atlas/atlas-properties.js";
import type { Guide } from "../types/guides.js";

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

	// 🆕 Guides migration
	if (!Array.isArray(parsed.guides)) parsed.guides = [];
	else parsed.guides = parsed.guides.filter(isValidGuide);
	if (typeof parsed.showGuides !== "boolean") parsed.showGuides = true;

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
 * چک می‌کنه آیا یه آبجکت guide معتبره یا نه.
 */
function isValidGuide(g: unknown): g is Guide {
	if (!g || typeof g !== "object") return false;
	const obj = g as Partial<Guide>;
	return typeof obj.id === "string" && (obj.axis === "horizontal" || obj.axis === "vertical") && typeof obj.position === "number" && Number.isFinite(obj.position);
}

/**
 * مهاجرت آبجکت‌های قدیمی به سیستم components.
 */
function migrateObjectToComponents(obj: GameObject): void {
	migrateAtlasComponentToProperties(obj);

	if (obj.components && obj.components.length > 0) {
		if (obj.type !== "gameobject" && obj.type !== "group") {
			obj.type = "gameobject";
		}
		return;
	}

	const components: Component[] = [];

	if (obj.type === "sprite") {
		if (!hasAtlasProperties(obj)) {
			components.push({
				id: createComponentId(),
				type: "sprite",
				texture: obj.texture ?? "",
				tint: "#ffffff",
			});
		}
	}

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

	if (obj.type !== "group") {
		obj.type = "gameobject";
	}
}

function migrateAtlasComponentToProperties(obj: GameObject): void {
	if (!obj.components || obj.components.length === 0) return;

	const atlasComp = obj.components.find((c) => (c as { type: string }).type === "atlas") as
		| {
				type: "atlas";
				texture?: string;
				atlasPath?: string;
				region?: string;
				tint?: string;
		  }
		| undefined;

	if (!atlasComp) return;

	if (!obj.properties) obj.properties = {};
	if (!obj.properties.atlas) {
		const migrated: Partial<AtlasProperties> = {
			texture: atlasComp.texture ?? obj.texture ?? "",
			atlasPath: atlasComp.atlasPath ?? "",
			tint: atlasComp.tint ?? "#ffffff",
			mode: "single",
			region: atlasComp.region ?? undefined,
		};
		obj.properties.atlas = normalizeAtlasProperties(migrated);
	}

	obj.components = obj.components.filter((c) => (c as { type: string }).type !== "atlas");

	if (obj.components.length === 0) {
		obj.components = undefined;
	}
}

function hasAtlasProperties(obj: GameObject): boolean {
	const raw = obj.properties?.atlas;
	return raw !== undefined && raw !== null && typeof raw === "object";
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

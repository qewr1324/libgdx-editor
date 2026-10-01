// src/editor/scene-mutations.ts
import type { GameObject, Layer, Scene, ReferenceImage, SafeArea } from "../types/scene.js";
import { createReferenceImage, createSafeArea } from "../types/scene.js";
import type { ShapeType, Component } from "../types/components.js";
import { createComponentId, isComponentUnique } from "../types/components.js";
import type { AtlasProperties } from "../features/texture-atlas/atlas-properties.js";
import { normalizeAtlasProperties } from "../features/texture-atlas/atlas-properties.js";

// ============================================================
// Factory Functions
// ============================================================

export function createObjectAt(type: GameObject["type"], x: number, y: number): GameObject {
	const id = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
	const components: Component[] = [];

	let defaultName = "object";
	let defaultColor = "#4a9eff";

	if (type === "sprite") {
		components.push({ id: createComponentId(), type: "sprite", texture: "", tint: "#ffffff" });
		defaultName = "sprite";
	} else if (type === "shape") {
		components.push({ id: createComponentId(), type: "shape", shape: "rectangle", color: "#ff4a4a", filled: true, strokeWidth: 1 });
		defaultName = "shape";
		defaultColor = "#ff4a4a";
	} else if (type === "text") {
		components.push({ id: createComponentId(), type: "text", text: "Label", color: "#ffffff", fontSize: 16 });
		defaultName = "text";
		defaultColor = "#ffffff";
	}

	return {
		id,
		type: type === "group" ? "group" : "gameobject",
		name: `${defaultName}_${id.slice(-4)}`,
		color: defaultColor,
		zIndex: 0,
		transform: { x, y, width: 64, height: 64, rotation: 0, scaleX: 1, scaleY: 1, originX: 0.5, originY: 0.5 },
		properties: {},
		components,
	};
}

export function createEmptyGameObject(x: number, y: number): GameObject {
	const id = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
	return {
		id,
		type: "gameobject",
		name: `object_${id.slice(-4)}`,
		zIndex: 0,
		transform: { x, y, width: 64, height: 64, rotation: 0, scaleX: 1, scaleY: 1, originX: 0.5, originY: 0.5 },
		properties: {},
		components: [],
	};
}

const shapeColors: Record<ShapeType, string> = {
	rectangle: "#ff4a4a",
	circle: "#4aff4a",
	triangle: "#ffaa4a",
	diamond: "#4affff",
	pentagon: "#aa4aff",
	hexagon: "#ffff4a",
	star: "#ff4aff",
};

export function createShapeAt(shapeType: ShapeType, x: number, y: number): GameObject {
	const obj = createObjectAt("shape", x, y);
	const id = obj.id;
	obj.name = `${shapeType}_${id.slice(-4)}`;
	if (obj.components) {
		obj.components = obj.components.map((c) => (c.type === "shape" ? { ...c, shape: shapeType, color: shapeColors[shapeType] ?? "#ff4a4a" } : c));
	}
	return obj;
}

// ============================================================
// Object Mutations
// ============================================================

export function addObjectToScene(scene: Scene, obj: GameObject, targetLayerId?: string): Scene {
	const newScene = structuredClone(scene) as Scene;
	if (newScene.layers.length === 0) {
		newScene.layers.push({ id: "layer_default", name: "default", zIndex: 0, visible: true, locked: false, objects: [] });
	}
	let targetLayer: Layer | undefined;
	if (targetLayerId) targetLayer = newScene.layers.find((l) => l.id === targetLayerId);
	if (!targetLayer) targetLayer = newScene.layers[0];
	obj.layerId = targetLayer.id;
	targetLayer.objects.push(obj);
	return newScene;
}

export function updateObjectInScene(scene: Scene, updated: GameObject): Scene {
	const newScene = structuredClone(scene) as Scene;
	for (const layer of newScene.layers) {
		const idx = layer.objects.findIndex((o) => o.id === updated.id);
		if (idx !== -1) {
			layer.objects[idx] = updated;
			return newScene;
		}
	}
	return newScene;
}

export function updateObjectsInScene(scene: Scene, objects: GameObject[]): Scene {
	const newScene = structuredClone(scene) as Scene;
	const map = new Map<string, GameObject>();
	for (const o of objects) map.set(o.id, o);
	for (const layer of newScene.layers) {
		for (let i = 0; i < layer.objects.length; i++) {
			const replacement = map.get(layer.objects[i].id);
			if (replacement) layer.objects[i] = replacement;
		}
	}
	return newScene;
}

export function deleteObjectFromScene(scene: Scene, id: string): Scene {
	const newScene = structuredClone(scene) as Scene;
	for (const layer of newScene.layers) layer.objects = layer.objects.filter((o) => o.id !== id);
	return newScene;
}

export function updateSceneFieldInScene(scene: Scene, field: string, value: unknown): Scene {
	const newScene = structuredClone(scene) as Scene;
	const keys = field.split(".");
	if (keys.length === 1) {
		(newScene as unknown as Record<string, unknown>)[keys[0]] = value;
	} else if (keys.length === 2) {
		const parent = (newScene as unknown as Record<string, unknown>)[keys[0]] as Record<string, unknown>;
		parent[keys[1]] = value;
	}
	return newScene;
}

// ============================================================
// Reference Image Mutations
// ============================================================

export function addReferenceImageToScene(scene: Scene, texture: string, x: number, y: number, width: number, height: number): Scene {
	const newScene = structuredClone(scene) as Scene;
	newScene.referenceImage = createReferenceImage(texture, x, y, width, height);
	return newScene;
}

export function updateReferenceImageInScene(scene: Scene, updates: Partial<ReferenceImage>): Scene {
	const newScene = structuredClone(scene) as Scene;
	if (!newScene.referenceImage) return newScene;
	newScene.referenceImage = { ...newScene.referenceImage, ...updates };
	return newScene;
}

export function updateReferenceImageTransformInScene(scene: Scene, transform: Partial<ReferenceImage["transform"]>): Scene {
	const newScene = structuredClone(scene) as Scene;
	if (!newScene.referenceImage) return newScene;
	newScene.referenceImage.transform = { ...newScene.referenceImage.transform, ...transform };
	return newScene;
}

export function removeReferenceImageFromScene(scene: Scene): Scene {
	const newScene = structuredClone(scene) as Scene;
	newScene.referenceImage = null;
	return newScene;
}

export function toggleReferenceImageHiddenInScene(scene: Scene): Scene {
	const newScene = structuredClone(scene) as Scene;
	if (!newScene.referenceImage) return newScene;
	newScene.referenceImage.hidden = !newScene.referenceImage.hidden;
	return newScene;
}

export function toggleReferenceImageLockInScene(scene: Scene): Scene {
	const newScene = structuredClone(scene) as Scene;
	if (!newScene.referenceImage) return newScene;
	newScene.referenceImage.locked = !newScene.referenceImage.locked;
	return newScene;
}

// ============================================================
// 🆕 Safe Area Mutations
// ============================================================

export function addSafeAreaToScene(scene: Scene): Scene {
	const newScene = structuredClone(scene) as Scene;
	if (newScene.safeArea) return newScene; // already exists
	newScene.safeArea = createSafeArea(newScene.worldSize.width, newScene.worldSize.height);
	return newScene;
}

export function updateSafeAreaInScene(scene: Scene, updates: Partial<SafeArea>): Scene {
	const newScene = structuredClone(scene) as Scene;
	if (!newScene.safeArea) return newScene;
	newScene.safeArea = { ...newScene.safeArea, ...updates };
	return newScene;
}

export function removeSafeAreaFromScene(scene: Scene): Scene {
	const newScene = structuredClone(scene) as Scene;
	newScene.safeArea = null;
	return newScene;
}

export function toggleSafeAreaVisibleInScene(scene: Scene): Scene {
	const newScene = structuredClone(scene) as Scene;
	if (!newScene.safeArea) return newScene;
	newScene.safeArea.visible = !newScene.safeArea.visible;
	return newScene;
}

// ============================================================
// Atlas Properties
// ============================================================

export function updateAtlasPropertiesInScene(scene: Scene, objectId: string, properties: Partial<AtlasProperties> | null): Scene {
	const newScene = structuredClone(scene) as Scene;
	for (const layer of newScene.layers) {
		const obj = layer.objects.find((o) => o.id === objectId);
		if (!obj) continue;
		if (!obj.properties) obj.properties = {};
		if (properties === null) {
			delete obj.properties.atlas;
			return newScene;
		}
		const existing = (obj.properties.atlas as Partial<AtlasProperties> | undefined) ?? {};
		obj.properties.atlas = normalizeAtlasProperties({ ...existing, ...properties });
		return newScene;
	}
	return newScene;
}

// ============================================================
// Duplicate
// ============================================================

export function duplicateObjectsInScene(scene: Scene, objectIds: string[], offsetX: number, offsetY: number): { scene: Scene; newIds: string[] } {
	const newScene = structuredClone(scene) as Scene;
	const newIds: string[] = [];
	for (const layer of newScene.layers) {
		const objectsToClone: GameObject[] = [];
		for (const obj of layer.objects) {
			if (objectIds.includes(obj.id)) {
				const clone = structuredClone(obj) as GameObject;
				clone.id = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
				clone.name = `${obj.name}_copy`;
				clone.transform.x += offsetX;
				clone.transform.y += offsetY;
				clone.zIndex = getNextZIndex(newScene);
				clone.layerId = layer.id;
				if (clone.components) clone.components = clone.components.map((c) => ({ ...c, id: createComponentId() }));
				objectsToClone.push(clone);
				newIds.push(clone.id);
			}
		}
		layer.objects.push(...objectsToClone);
	}
	return { scene: newScene, newIds };
}

// ============================================================
// Z-Index / Layer Operations
// ============================================================

export function getNextZIndex(scene: Scene): number {
	let max = -1;
	for (const layer of scene.layers) {
		for (const obj of layer.objects) {
			const z = obj.zIndex ?? 0;
			if (z > max) max = z;
		}
	}
	return max + 1;
}

export function setObjectZIndexInScene(scene: Scene, objectId: string, zIndex: number): Scene {
	const newScene = structuredClone(scene) as Scene;
	for (const layer of newScene.layers) {
		const obj = layer.objects.find((o) => o.id === objectId);
		if (obj) {
			obj.zIndex = zIndex;
			return newScene;
		}
	}
	return newScene;
}

export function bringForwardInScene(scene: Scene, objectId: string): Scene {
	const newScene = structuredClone(scene) as Scene;
	const allZ: number[] = [];
	for (const layer of newScene.layers) {
		for (const obj of layer.objects) {
			if (obj.id !== objectId) allZ.push(obj.zIndex ?? 0);
		}
	}
	if (allZ.length === 0) return scene;
	allZ.sort((a, b) => a - b);
	const maxOther = allZ[allZ.length - 1];
	for (const layer of newScene.layers) {
		const obj = layer.objects.find((o) => o.id === objectId);
		if (obj) {
			const currentZ = obj.zIndex ?? 0;
			if (currentZ > maxOther) return scene;
			const above = allZ.find((z) => z > currentZ);
			obj.zIndex = above !== undefined ? above + 0.5 : maxOther + 1;
			return newScene;
		}
	}
	return scene;
}

export function sendBackwardInScene(scene: Scene, objectId: string): Scene {
	const newScene = structuredClone(scene) as Scene;
	const allZ: number[] = [];
	for (const layer of newScene.layers) {
		for (const obj of layer.objects) {
			if (obj.id !== objectId) allZ.push(obj.zIndex ?? 0);
		}
	}
	if (allZ.length === 0) return scene;
	allZ.sort((a, b) => a - b);
	const minOther = allZ[0];
	for (const layer of newScene.layers) {
		const obj = layer.objects.find((o) => o.id === objectId);
		if (obj) {
			const currentZ = obj.zIndex ?? 0;
			if (currentZ < minOther) return scene;
			const below = [...allZ].reverse().find((z) => z < currentZ);
			obj.zIndex = below !== undefined ? below - 0.5 : minOther - 1;
			return newScene;
		}
	}
	return scene;
}

export function bringToFrontInScene(scene: Scene, objectId: string): Scene {
	const newScene = structuredClone(scene) as Scene;
	let max = -1;
	for (const layer of newScene.layers) {
		for (const obj of layer.objects) {
			if (obj.id !== objectId) {
				const z = obj.zIndex ?? 0;
				if (z > max) max = z;
			}
		}
	}
	for (const layer of newScene.layers) {
		const obj = layer.objects.find((o) => o.id === objectId);
		if (obj) {
			obj.zIndex = max + 1;
			return newScene;
		}
	}
	return scene;
}

export function sendToBackInScene(scene: Scene, objectId: string): Scene {
	const newScene = structuredClone(scene) as Scene;
	let min = 0;
	for (const layer of newScene.layers) {
		for (const obj of layer.objects) {
			if (obj.id !== objectId) {
				const z = obj.zIndex ?? 0;
				if (z < min) min = z;
			}
		}
	}
	for (const layer of newScene.layers) {
		const obj = layer.objects.find((o) => o.id === objectId);
		if (obj) {
			obj.zIndex = min - 1;
			return newScene;
		}
	}
	return scene;
}

// ============================================================
// Layer Move
// ============================================================

export function moveObjectToLayerInScene(scene: Scene, objectId: string, targetLayerId: string): Scene {
	const newScene = structuredClone(scene) as Scene;
	let obj: GameObject | null = null;
	let sourceLayer: Layer | null = null;
	let sourceIdx = -1;
	for (const layer of newScene.layers) {
		const idx = layer.objects.findIndex((o) => o.id === objectId);
		if (idx !== -1) {
			obj = layer.objects[idx];
			sourceLayer = layer;
			sourceIdx = idx;
			break;
		}
	}
	if (!obj || !sourceLayer || sourceIdx === -1) return scene;
	const targetLayer = newScene.layers.find((l) => l.id === targetLayerId);
	if (!targetLayer || sourceLayer.id === targetLayer.id) return scene;
	sourceLayer.objects.splice(sourceIdx, 1);
	obj.layerId = targetLayer.id;
	obj.zIndex = getNextZIndexForLayer(newScene, targetLayer.id);
	targetLayer.objects.push(obj);
	return newScene;
}

function getNextZIndexForLayer(scene: Scene, layerId: string): number {
	const layer = scene.layers.find((l) => l.id === layerId);
	if (!layer) return 0;
	let max = -1;
	for (const obj of layer.objects) {
		const z = obj.zIndex ?? 0;
		if (z > max) max = z;
	}
	return max + 1;
}

// ============================================================
// Component Mutations
// ============================================================

export function addComponentToObjectInScene(scene: Scene, objectId: string, component: Component): Scene {
	const newScene = structuredClone(scene) as Scene;
	for (const layer of newScene.layers) {
		const obj = layer.objects.find((o) => o.id === objectId);
		if (obj) {
			if (!obj.components) obj.components = [];
			if (isComponentUnique(component.type)) {
				const existingIdx = obj.components.findIndex((c) => c.type === component.type);
				if (existingIdx !== -1) {
					obj.components[existingIdx] = component;
					return newScene;
				}
			}
			obj.components.push(component);
			return newScene;
		}
	}
	return newScene;
}

export function updateComponentInScene(scene: Scene, objectId: string, componentId: string, updates: Partial<Component>): Scene {
	const newScene = structuredClone(scene) as Scene;
	for (const layer of newScene.layers) {
		const obj = layer.objects.find((o) => o.id === objectId);
		if (obj && obj.components) {
			const idx = obj.components.findIndex((c) => c.id === componentId);
			if (idx !== -1) {
				obj.components[idx] = { ...obj.components[idx], ...updates } as Component;
				return newScene;
			}
		}
	}
	return newScene;
}

export function removeComponentFromScene(scene: Scene, objectId: string, componentId: string): Scene {
	const newScene = structuredClone(scene) as Scene;
	for (const layer of newScene.layers) {
		const obj = layer.objects.find((o) => o.id === objectId);
		if (obj && obj.components) {
			obj.components = obj.components.filter((c) => c.id !== componentId);
			return newScene;
		}
	}
	return newScene;
}

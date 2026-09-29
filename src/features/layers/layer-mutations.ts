// src/features/layers/layer-mutations.ts
import type { Layer, Scene } from "../../types/scene.js";

/**
 * عملیات خالص (pure) روی layer ها.
 * همه توابع scene جدید برمی‌گردونن (immutable).
 */

export function addLayerToScene(scene: Scene, name?: string): { scene: Scene; newLayerName: string } {
	const newScene = structuredClone(scene) as Scene;

	let baseName = name?.trim() || "layer";
	let finalName = baseName;
	let counter = 1;
	while (newScene.layers.some((l) => l.name === finalName)) {
		finalName = `${baseName}_${counter++}`;
	}

	const maxZ = newScene.layers.reduce((m, l) => Math.max(m, l.zIndex), -1);

	newScene.layers.push({
		name: finalName,
		zIndex: maxZ + 1,
		visible: true,
		locked: false,
		objects: [],
	});

	return { scene: newScene, newLayerName: finalName };
}

export function deleteLayerFromScene(scene: Scene, name: string): Scene {
	const newScene = structuredClone(scene) as Scene;
	if (newScene.layers.length <= 1) {
		return scene;
	}
	newScene.layers = newScene.layers.filter((l) => l.name !== name);
	return newScene;
}

export function renameLayerInScene(scene: Scene, oldName: string, newName: string): Scene {
	const trimmed = newName.trim();
	if (!trimmed || trimmed === oldName) return scene;
	if (scene.layers.some((l) => l.name === trimmed)) return scene;

	const newScene = structuredClone(scene) as Scene;
	const layer = newScene.layers.find((l) => l.name === oldName);
	if (layer) layer.name = trimmed;
	return newScene;
}

export function toggleLayerVisibilityInScene(scene: Scene, name: string): Scene {
	const newScene = structuredClone(scene) as Scene;
	const layer = newScene.layers.find((l) => l.name === name);
	if (layer) layer.visible = !layer.visible;
	return newScene;
}

export function toggleLayerLockInScene(scene: Scene, name: string): Scene {
	const newScene = structuredClone(scene) as Scene;
	const layer = newScene.layers.find((l) => l.name === name);
	if (layer) layer.locked = !layer.locked;
	return newScene;
}

export function moveLayerUpInScene(scene: Scene, name: string): Scene {
	const newScene = structuredClone(scene) as Scene;
	const idx = newScene.layers.findIndex((l) => l.name === name);
	if (idx < 0 || idx >= newScene.layers.length - 1) return scene;

	const tmp = newScene.layers[idx];
	newScene.layers[idx] = newScene.layers[idx + 1];
	newScene.layers[idx + 1] = tmp;

	newScene.layers.forEach((l, i) => (l.zIndex = i));
	return newScene;
}

export function moveLayerDownInScene(scene: Scene, name: string): Scene {
	const newScene = structuredClone(scene) as Scene;
	const idx = newScene.layers.findIndex((l) => l.name === name);
	if (idx <= 0) return scene;

	const tmp = newScene.layers[idx];
	newScene.layers[idx] = newScene.layers[idx - 1];
	newScene.layers[idx - 1] = tmp;

	newScene.layers.forEach((l, i) => (l.zIndex = i));
	return newScene;
}

export function reorderLayersInScene(scene: Scene, fromIndex: number, toIndex: number): Scene {
	const newScene = structuredClone(scene) as Scene;
	if (fromIndex < 0 || fromIndex >= newScene.layers.length) return scene;
	if (toIndex < 0 || toIndex >= newScene.layers.length) return scene;
	if (fromIndex === toIndex) return scene;

	const [moved] = newScene.layers.splice(fromIndex, 1);
	newScene.layers.splice(toIndex, 0, moved);

	newScene.layers.forEach((l, i) => (l.zIndex = i));
	return newScene;
}

/**
 * helpers
 */
export function findLayerByName(scene: Scene, name: string): Layer | null {
	return scene.layers.find((l) => l.name === name) ?? null;
}

export function countObjectsInLayer(layer: Layer): number {
	return layer.objects.length;
}

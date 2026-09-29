import type { GameObject, Scene } from "../types/scene.js";
import type { ShapeType } from "../config/config-types.js";

export function createObjectAt(type: GameObject["type"], x: number, y: number): GameObject {
	const id = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
	const names: Record<string, string> = {
		sprite: "sprite",
		shape: "shape",
		text: "text",
		group: "group",
	};
	const colors: Record<string, string> = {
		sprite: "#4a9eff",
		shape: "#ff4a4a",
		text: "#ffffff",
		group: "#9b59b6",
	};
	return {
		id,
		type,
		name: `${names[type]}_${id.slice(-4)}`,
		color: colors[type],
		zIndex: 0,
		transform: {
			x,
			y,
			width: 64,
			height: 64,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
			originX: 0.5,
			originY: 0.5,
		},
		properties: {},
	};
}

export function createShapeAt(shapeType: ShapeType, x: number, y: number): GameObject {
	const obj = createObjectAt("shape", x, y);
	const id = obj.id;
	obj.name = `${shapeType}_${id.slice(-4)}`;
	obj.properties = { ...obj.properties, shapeType };

	const shapeColors: Record<ShapeType, string> = {
		rectangle: "#ff4a4a",
		circle: "#4aff4a",
		triangle: "#ffaa4a",
		diamond: "#4affff",
		pentagon: "#aa4aff",
		hexagon: "#ffff4a",
		star: "#ff4aff",
	};
	obj.color = shapeColors[shapeType] ?? "#ff4a4a";

	return obj;
}

export function addObjectToScene(scene: Scene, obj: GameObject): Scene {
	const newScene = structuredClone(scene) as Scene;
	if (newScene.layers.length === 0) {
		newScene.layers.push({
			name: "default",
			zIndex: 0,
			visible: true,
			locked: false,
			objects: [],
		});
	}
	newScene.layers[0].objects.push(obj);
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
			if (replacement) {
				layer.objects[i] = replacement;
			}
		}
	}
	return newScene;
}

export function deleteObjectFromScene(scene: Scene, id: string): Scene {
	const newScene = structuredClone(scene) as Scene;
	for (const layer of newScene.layers) {
		layer.objects = layer.objects.filter((o) => o.id !== id);
	}
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

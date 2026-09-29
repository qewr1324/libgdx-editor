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
				objectsToClone.push(clone);
				newIds.push(clone.id);
			}
		}
		layer.objects.push(...objectsToClone);
	}

	return { scene: newScene, newIds };
}

// ============================================================
// Align / Distribute
// ============================================================

export type AlignMode = "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom";
export type DistributeMode = "horizontal" | "vertical";

export function alignObjectsInScene(scene: Scene, objectIds: string[], mode: AlignMode): Scene {
	const newScene = structuredClone(scene) as Scene;
	const objects: GameObject[] = [];

	for (const layer of newScene.layers) {
		for (const obj of layer.objects) {
			if (objectIds.includes(obj.id)) objects.push(obj);
		}
	}

	if (objects.length < 2) return scene;

	const getLeft = (o: GameObject) => o.transform.x - o.transform.width * o.transform.originX;
	const getRight = (o: GameObject) => getLeft(o) + o.transform.width;
	const getTop = (o: GameObject) => o.transform.y - o.transform.height * o.transform.originY;
	const getBottom = (o: GameObject) => getTop(o) + o.transform.height;
	const getCenterX = (o: GameObject) => getLeft(o) + o.transform.width / 2;
	const getCenterY = (o: GameObject) => getTop(o) + o.transform.height / 2;

	switch (mode) {
		case "left": {
			const min = Math.min(...objects.map(getLeft));
			for (const o of objects) o.transform.x = min + o.transform.width * o.transform.originX;
			break;
		}
		case "right": {
			const max = Math.max(...objects.map(getRight));
			for (const o of objects) o.transform.x = max - o.transform.width * (1 - o.transform.originX);
			break;
		}
		case "hcenter": {
			const sum = objects.reduce((acc, o) => acc + getCenterX(o), 0);
			const avg = sum / objects.length;
			for (const o of objects) o.transform.x = avg - o.transform.width * (0.5 - o.transform.originX);
			break;
		}
		case "top": {
			const min = Math.min(...objects.map(getTop));
			for (const o of objects) o.transform.y = min + o.transform.height * o.transform.originY;
			break;
		}
		case "bottom": {
			const max = Math.max(...objects.map(getBottom));
			for (const o of objects) o.transform.y = max - o.transform.height * (1 - o.transform.originY);
			break;
		}
		case "vcenter": {
			const sum = objects.reduce((acc, o) => acc + getCenterY(o), 0);
			const avg = sum / objects.length;
			for (const o of objects) o.transform.y = avg - o.transform.height * (0.5 - o.transform.originY);
			break;
		}
	}

	return newScene;
}

export function distributeObjectsInScene(scene: Scene, objectIds: string[], mode: DistributeMode): Scene {
	const newScene = structuredClone(scene) as Scene;
	const objects: GameObject[] = [];

	for (const layer of newScene.layers) {
		for (const obj of layer.objects) {
			if (objectIds.includes(obj.id)) objects.push(obj);
		}
	}

	if (objects.length < 3) return scene;

	if (mode === "horizontal") {
		objects.sort((a, b) => a.transform.x - b.transform.x);
		const first = objects[0];
		const last = objects[objects.length - 1];
		const totalSpan = last.transform.x - first.transform.x;
		const step = totalSpan / (objects.length - 1);
		for (let i = 0; i < objects.length; i++) {
			objects[i].transform.x = first.transform.x + step * i;
		}
	} else {
		objects.sort((a, b) => a.transform.y - b.transform.y);
		const first = objects[0];
		const last = objects[objects.length - 1];
		const totalSpan = last.transform.y - first.transform.y;
		const step = totalSpan / (objects.length - 1);
		for (let i = 0; i < objects.length; i++) {
			objects[i].transform.y = first.transform.y + step * i;
		}
	}

	return newScene;
}

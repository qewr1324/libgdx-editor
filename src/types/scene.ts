// src/types/scene.ts
import type { Component } from "./components.js";
import type { Guide } from "./guides.js";

// ============================================================
// Basic Types
// ============================================================

export interface Vec2 {
	x: number;
	y: number;
}

export interface Transform {
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number;
	scaleX: number;
	scaleY: number;
	originX: number;
	originY: number;
}

export type GameObjectType = "gameobject" | "sprite" | "shape" | "text" | "group";

// ============================================================
// GameObject
// ============================================================

export interface GameObject {
	id: string;
	type: GameObjectType;
	name: string;

	/** @deprecated از components (sprite) استفاده کن */
	texture?: string;
	/** @deprecated از components.shape.color استفاده کن */
	color?: string;

	zIndex?: number;
	layerId?: string;
	transform: Transform;
	properties: Record<string, unknown>;

	components?: Component[];
	children?: GameObject[];
}

// ============================================================
// Reference Image
// ============================================================

export interface ReferenceImage {
	/** مسیر نسبی تصویر (نسبی به scene) */
	texture: string;
	/** موقعیت و اندازه */
	transform: Transform;
	/** شفافیت (0-1) */
	opacity: number;
	/** مخفی */
	hidden?: boolean;
	/** قفل (نه drag، نه select) */
	locked?: boolean;
	/** tint (hex) */
	tint?: string;
}

// ============================================================
// Layer / Scene
// ============================================================

export interface Layer {
	id?: string;
	name: string;
	zIndex: number;
	visible: boolean;
	locked?: boolean;
	objects: GameObject[];
}

export interface Camera {
	x: number;
	y: number;
	zoom: number;
}

export interface Scene {
	version: string;
	name: string;
	theme?: string;
	themeOverride?: string | null;
	worldSize: { width: number; height: number };
	backgroundColor: string;
	gridSize: number;
	snapToGrid: boolean;
	snapToObjects: boolean;
	camera: Camera;
	layers: Layer[];

	guides?: Guide[];
	showGuides?: boolean;

	referenceImage?: ReferenceImage | null;
}

// ============================================================
// Factory Functions
// ============================================================

export function createEmptyScene(name = "untitled"): Scene {
	return {
		version: "1.0",
		name,
		themeOverride: null,
		worldSize: { width: 1920, height: 1080 },
		backgroundColor: "#1a1a1a",
		gridSize: 32,
		snapToGrid: false,
		snapToObjects: false,
		camera: { x: 0, y: 0, zoom: 1 },
		layers: [
			{
				id: "layer_default",
				name: "default",
				zIndex: 0,
				visible: true,
				locked: false,
				objects: [],
			},
		],
		guides: [],
		showGuides: true,
		referenceImage: null,
	};
}

export function createGameObject(type: GameObjectType, x: number, y: number): GameObject {
	return {
		id: `obj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
		type,
		name: type,
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
		components: [],
	};
}

export function createReferenceImage(texture: string, x: number, y: number, width: number, height: number): ReferenceImage {
	return {
		texture,
		transform: {
			x,
			y,
			width,
			height,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
			originX: 0.5,
			originY: 0.5,
		},
		opacity: 0.5,
		hidden: false,
		locked: false,
	};
}

// ============================================================
// Utilities
// ============================================================

export function sortObjectsByZIndex(objects: GameObject[]): GameObject[] {
	return [...objects].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
}

export function findLayerOfObject(scene: Scene, objectId: string): { layer: Layer; index: number } | null {
	for (const layer of scene.layers) {
		const idx = layer.objects.findIndex((o) => o.id === objectId);
		if (idx !== -1) return { layer, index: idx };
	}
	return null;
}

export function getLayerNameOfObject(scene: Scene, obj: GameObject): string {
	if (obj.layerId) {
		const layer = scene.layers.find((l) => l.id === obj.layerId);
		if (layer) return layer.name;
	}
	const found = findLayerOfObject(scene, obj.id);
	return found?.layer.name ?? "default";
}

export function getLayerId(layer: Layer): string {
	return layer.id ?? `layer_${layer.name.replace(/[^a-z0-9]/gi, "_")}`;
}

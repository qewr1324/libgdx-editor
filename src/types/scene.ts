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

export type GameObjectType = "sprite" | "shape" | "text" | "group";

export interface GameObject {
	id: string;
	type: GameObjectType;
	name: string;
	texture?: string;
	color?: string;
	transform: Transform;
	properties: Record<string, unknown>;
	children?: GameObject[];
}

export interface Layer {
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
	theme?: string; // ← اضافه شد
	worldSize: { width: number; height: number };
	backgroundColor: string;
	gridSize: number;
	snapToGrid: boolean;
	snapToObjects: boolean;
	camera: Camera;
	layers: Layer[];
}

export function createEmptyScene(name = "untitled"): Scene {
	return {
		version: "1.0",
		name,
		theme: "win98", // ← پیش‌فرض
		worldSize: { width: 1920, height: 1080 },
		backgroundColor: "#1a1a1a",
		gridSize: 32,
		snapToGrid: false,
		snapToObjects: false,
		camera: { x: 0, y: 0, zoom: 1 },
		layers: [
			{
				name: "default",
				zIndex: 0,
				visible: true,
				locked: false,
				objects: [],
			},
		],
	};
}

export function createGameObject(type: GameObjectType, x: number, y: number): GameObject {
	return {
		id: `obj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
		type,
		name: type,
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

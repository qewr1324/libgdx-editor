// src/types/components.ts
//
// سیستم کامپوننت‌ها برای LibGDX Editor
// هر GameObject می‌تونه چند تا از این component ها رو داشته باشه.
//
// انواع فعلی:
//   - sprite     → یه texture ساده
//   - atlas      → یه region از یه texture atlas
//   - animation  → دنباله‌ای از region ها با fps
//   - shape      → rectangle / circle / ...
//   - text       → یه label متنی
//

// ============================================================
// Component Types
// ============================================================

export type ComponentType = "sprite" | "atlas" | "animation" | "shape" | "text";

// ---------- Sprite ----------
export interface SpriteComponent {
	id: string;
	type: "sprite";
	texture: string;
	tint?: string;
	flipX?: boolean;
	flipY?: boolean;
}

// ---------- Atlas (single region) ----------
export interface AtlasComponent {
	id: string;
	type: "atlas";
	texture: string;
	atlasPath: string;
	region: string;
	tint?: string;
}

// ---------- Animation ----------
export type AnimationPlayMode = "NORMAL" | "REVERSED" | "LOOP" | "LOOP_REVERSED" | "LOOP_PINGPONG" | "LOOP_RANDOM";

export interface AnimationComponent {
	id: string;
	type: "animation";
	atlasPath: string;
	texture: string;
	frames: string[];
	fps: number;
	loop: boolean;
	autoplay: boolean;
	playMode: AnimationPlayMode;
}

// ---------- Shape ----------
export type ShapeType = "rectangle" | "circle" | "triangle" | "diamond" | "pentagon" | "hexagon" | "star";

export interface ShapeComponent {
	id: string;
	type: "shape";
	shape: ShapeType;
	color: string;
	filled: boolean;
	strokeColor?: string;
	strokeWidth?: number;
}

// ---------- Text ----------
export interface TextComponent {
	id: string;
	type: "text";
	text: string;
	color: string;
	fontSize: number;
}

// ---------- Union ----------
export type Component = SpriteComponent | AtlasComponent | AnimationComponent | ShapeComponent | TextComponent;

// ============================================================
// Helpers
// ============================================================

export function createComponentId(): string {
	return `comp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function findComponent<T extends ComponentType>(components: Component[] | undefined, type: T): Extract<Component, { type: T }> | null {
	if (!components) return null;
	return (components.find((c) => c.type === type) as Extract<Component, { type: T }>) ?? null;
}

export function findComponentById(components: Component[] | undefined, id: string): Component | null {
	if (!components) return null;
	return components.find((c) => c.id === id) ?? null;
}

export function hasComponent(components: Component[] | undefined, type: ComponentType): boolean {
	if (!components) return false;
	return components.some((c) => c.type === type);
}

/**
 * یه component پیش‌فرض از نوع داده‌شده می‌سازه.
 */
export function createDefaultComponent(type: ComponentType): Component {
	const id = createComponentId();

	switch (type) {
		case "sprite":
			return {
				id,
				type: "sprite",
				texture: "",
				tint: "#ffffff",
			};

		case "atlas":
			return {
				id,
				type: "atlas",
				texture: "",
				atlasPath: "",
				region: "",
				tint: "#ffffff",
			};

		case "animation":
			return {
				id,
				type: "animation",
				atlasPath: "",
				texture: "",
				frames: [],
				fps: 8,
				loop: true,
				autoplay: true,
				playMode: "LOOP",
			};

		case "shape":
			return {
				id,
				type: "shape",
				shape: "rectangle",
				color: "#4a9eff",
				filled: true,
				strokeWidth: 1,
			};

		case "text":
			return {
				id,
				type: "text",
				text: "Label",
				color: "#ffffff",
				fontSize: 16,
			};
	}
}

/**
 * لیبل برای نمایش در UI.
 */
export const COMPONENT_LABELS: Record<ComponentType, string> = {
	sprite: "Sprite",
	atlas: "Atlas Region",
	animation: "Animation",
	shape: "Shape",
	text: "Text",
};

/**
 * آیکون برای نمایش در UI.
 */
export const COMPONENT_ICONS: Record<ComponentType, string> = {
	sprite: "🖼️",
	atlas: "🗺️",
	animation: "🎬",
	shape: "⬛",
	text: "🔤",
};

/**
 * ترتیب نمایش در dropdown.
 */
export const COMPONENT_ORDER: ComponentType[] = ["sprite", "atlas", "animation", "shape", "text"];

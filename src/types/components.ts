// src/types/components.ts
//
// سیستم کامپوننت‌ها برای LibGDX Editor
// هر GameObject می‌تونه از هر نوع component فقط یکی داشته باشه.
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

// ============================================================
// Registry — تعریف انواع کامپوننت‌ها
// ============================================================

export interface ComponentDefinition {
	type: ComponentType;
	label: string;
	icon: string;
	/** اگه true، فقط یکی از این نوع می‌تونه روی یه آبجکت باشه */
	unique: boolean;
	/** factory برای ساخت sample اولیه */
	create: () => Component;
}

export const COMPONENT_DEFINITIONS: Record<ComponentType, ComponentDefinition> = {
	sprite: {
		type: "sprite",
		label: "Sprite",
		icon: "🖼️",
		unique: true,
		create: () => ({
			id: createComponentId(),
			type: "sprite",
			texture: "",
			tint: "#ffffff",
		}),
	},
	atlas: {
		type: "atlas",
		label: "Atlas Region",
		icon: "🗺️",
		unique: true,
		create: () => ({
			id: createComponentId(),
			type: "atlas",
			texture: "",
			atlasPath: "",
			region: "",
			tint: "#ffffff",
		}),
	},
	animation: {
		type: "animation",
		label: "Animation",
		icon: "🎬",
		unique: true,
		create: () => ({
			id: createComponentId(),
			type: "animation",
			atlasPath: "",
			texture: "",
			frames: [],
			fps: 8,
			loop: true,
			autoplay: true,
			playMode: "LOOP",
		}),
	},
	shape: {
		type: "shape",
		label: "Shape",
		icon: "⬛",
		unique: true,
		create: () => ({
			id: createComponentId(),
			type: "shape",
			shape: "rectangle",
			color: "#4a9eff",
			filled: true,
			strokeWidth: 1,
		}),
	},
	text: {
		type: "text",
		label: "Text",
		icon: "🔤",
		unique: true,
		create: () => ({
			id: createComponentId(),
			type: "text",
			text: "Label",
			color: "#ffffff",
			fontSize: 16,
		}),
	},
};

/** ترتیب نمایش در UI */
export const COMPONENT_ORDER: ComponentType[] = ["sprite", "atlas", "animation", "shape", "text"];

/** لیبل‌ها (برای دسترسی سریع) */
export const COMPONENT_LABELS: Record<ComponentType, string> = {
	sprite: COMPONENT_DEFINITIONS.sprite.label,
	atlas: COMPONENT_DEFINITIONS.atlas.label,
	animation: COMPONENT_DEFINITIONS.animation.label,
	shape: COMPONENT_DEFINITIONS.shape.label,
	text: COMPONENT_DEFINITIONS.text.label,
};

/** آیکون‌ها (برای دسترسی سریع) */
export const COMPONENT_ICONS: Record<ComponentType, string> = {
	sprite: COMPONENT_DEFINITIONS.sprite.icon,
	atlas: COMPONENT_DEFINITIONS.atlas.icon,
	animation: COMPONENT_DEFINITIONS.animation.icon,
	shape: COMPONENT_DEFINITIONS.shape.icon,
	text: COMPONENT_DEFINITIONS.text.icon,
};

// ============================================================
// Factory
// ============================================================

export function createDefaultComponent(type: ComponentType): Component {
	return COMPONENT_DEFINITIONS[type].create();
}

export function isComponentUnique(type: ComponentType): boolean {
	return COMPONENT_DEFINITIONS[type].unique;
}

/**
 * بررسی می‌کنه که آیا این type رو میشه به آبجکت اضافه کرد.
 * اگه unique باشه و از قبل وجود داشته باشه، false برمی‌گردونه.
 */
export function canAddComponent(components: Component[] | undefined, type: ComponentType): boolean {
	if (!isComponentUnique(type)) return true;
	return !hasComponent(components, type);
}

/**
 * لیست component type های قابل اضافه به آبجکت.
 */
export function getAvailableComponentTypes(components: Component[] | undefined): ComponentType[] {
	return COMPONENT_ORDER.filter((t) => canAddComponent(components, t));
}

// src/types/components.ts
//
// سیستم کامپوننت‌ها برای LibGDX Editor
//
// Visual components (خودکار با ساخت آبجکت):
//   - sprite, atlas, animation, shape, text
//
// Logic components (اضافه شدن دستی از تب Components):
//   - physics, collider, script, tag, custom
//

// ============================================================
// Visual Component Types
// ============================================================

export type VisualComponentType = "sprite" | "atlas" | "animation" | "shape" | "text";

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

// ============================================================
// Logic Component Types
// ============================================================

// ---------- Physics ----------
export type PhysicsBodyType = "dynamic" | "static" | "kinematic";

export interface PhysicsComponent {
	id: string;
	type: "physics";
	bodyType: PhysicsBodyType;
	mass: number;
	gravityScale: number;
	velocityX: number;
	velocityY: number;
	linearDamping: number;
	angularDamping: number;
	fixedRotation: boolean;
}

// ---------- Collider ----------
export type ColliderShape = "box" | "circle" | "polygon";

export interface ColliderComponent {
	id: string;
	type: "collider";
	shape: ColliderShape;
	width: number;
	height: number;
	radius: number;
	isTrigger: boolean;
	friction: number;
	restitution: number;
}

// ---------- Script ----------
export interface ScriptComponent {
	id: string;
	type: "script";
	className: string;
	scriptPath: string;
	enabled: boolean;
	propertiesJson: string;
}

// ---------- Tag ----------
export interface TagComponent {
	id: string;
	type: "tag";
	tags: string[];
}

// ---------- Custom ----------
export interface CustomComponent {
	id: string;
	type: "custom";
	name: string;
	propertiesJson: string;
}

// ---------- Union ----------
export type ComponentType = VisualComponentType | "physics" | "collider" | "script" | "tag" | "custom";

export type VisualComponent = SpriteComponent | AtlasComponent | AnimationComponent | ShapeComponent | TextComponent;
export type LogicComponent = PhysicsComponent | ColliderComponent | ScriptComponent | TagComponent | CustomComponent;

export type Component = VisualComponent | LogicComponent;

// ============================================================
// Helpers
// ============================================================

export function createComponentId(): string {
	return `comp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function isVisualComponent(type: ComponentType): type is VisualComponentType {
	return type === "sprite" || type === "atlas" || type === "animation" || type === "shape" || type === "text";
}

export function isLogicComponent(type: ComponentType): boolean {
	return !isVisualComponent(type);
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
// Registry
// ============================================================

export interface ComponentDefinition {
	type: ComponentType;
	label: string;
	icon: string;
	unique: boolean;
	create: () => Component;
}

export const COMPONENT_DEFINITIONS: Record<ComponentType, ComponentDefinition> = {
	sprite: {
		type: "sprite",
		label: "Sprite",
		icon: "🖼️",
		unique: true,
		create: () => ({ id: createComponentId(), type: "sprite", texture: "", tint: "#ffffff" }),
	},
	atlas: {
		type: "atlas",
		label: "Atlas Region",
		icon: "🗺️",
		unique: true,
		create: () => ({ id: createComponentId(), type: "atlas", texture: "", atlasPath: "", region: "", tint: "#ffffff" }),
	},
	animation: {
		type: "animation",
		label: "Animation",
		icon: "🎬",
		unique: true,
		create: () => ({ id: createComponentId(), type: "animation", atlasPath: "", texture: "", frames: [], fps: 8, loop: true, autoplay: true, playMode: "LOOP" }),
	},
	shape: {
		type: "shape",
		label: "Shape",
		icon: "⬛",
		unique: true,
		create: () => ({ id: createComponentId(), type: "shape", shape: "rectangle", color: "#4a9eff", filled: true, strokeWidth: 1 }),
	},
	text: {
		type: "text",
		label: "Text",
		icon: "🔤",
		unique: true,
		create: () => ({ id: createComponentId(), type: "text", text: "Label", color: "#ffffff", fontSize: 16 }),
	},
	physics: {
		type: "physics",
		label: "Physics",
		icon: "🎬",
		unique: true,
		create: () => ({
			id: createComponentId(),
			type: "physics",
			bodyType: "dynamic",
			mass: 1,
			gravityScale: 1,
			velocityX: 0,
			velocityY: 0,
			linearDamping: 0,
			angularDamping: 0,
			fixedRotation: false,
		}),
	},
	collider: {
		type: "collider",
		label: "Collider",
		icon: "💥",
		unique: true,
		create: () => ({
			id: createComponentId(),
			type: "collider",
			shape: "box",
			width: 64,
			height: 64,
			radius: 32,
			isTrigger: false,
			friction: 0.2,
			restitution: 0,
		}),
	},
	script: {
		type: "script",
		label: "Script",
		icon: "📜",
		unique: true,
		create: () => ({ id: createComponentId(), type: "script", className: "MyScript", scriptPath: "", enabled: true, propertiesJson: "{}" }),
	},
	tag: {
		type: "tag",
		label: "Tag",
		icon: "🏷️",
		unique: true,
		create: () => ({ id: createComponentId(), type: "tag", tags: [] }),
	},
	custom: {
		type: "custom",
		label: "Custom",
		icon: "✨",
		unique: true,
		create: () => ({ id: createComponentId(), type: "custom", name: "MyComponent", propertiesJson: "{}" }),
	},
};

export const VISUAL_COMPONENT_ORDER: VisualComponentType[] = ["sprite", "atlas", "animation", "shape", "text"];

export const LOGIC_COMPONENT_ORDER: ComponentType[] = ["physics", "collider", "script", "tag", "custom"];

export const COMPONENT_ORDER: ComponentType[] = [...VISUAL_COMPONENT_ORDER, ...LOGIC_COMPONENT_ORDER];

export const COMPONENT_LABELS: Record<ComponentType, string> = {
	sprite: COMPONENT_DEFINITIONS.sprite.label,
	atlas: COMPONENT_DEFINITIONS.atlas.label,
	animation: COMPONENT_DEFINITIONS.animation.label,
	shape: COMPONENT_DEFINITIONS.shape.label,
	text: COMPONENT_DEFINITIONS.text.label,
	physics: COMPONENT_DEFINITIONS.physics.label,
	collider: COMPONENT_DEFINITIONS.collider.label,
	script: COMPONENT_DEFINITIONS.script.label,
	tag: COMPONENT_DEFINITIONS.tag.label,
	custom: COMPONENT_DEFINITIONS.custom.label,
};

export const COMPONENT_ICONS: Record<ComponentType, string> = {
	sprite: COMPONENT_DEFINITIONS.sprite.icon,
	atlas: COMPONENT_DEFINITIONS.atlas.icon,
	animation: COMPONENT_DEFINITIONS.animation.icon,
	shape: COMPONENT_DEFINITIONS.shape.icon,
	text: COMPONENT_DEFINITIONS.text.icon,
	physics: COMPONENT_DEFINITIONS.physics.icon,
	collider: COMPONENT_DEFINITIONS.collider.icon,
	script: COMPONENT_DEFINITIONS.script.icon,
	tag: COMPONENT_DEFINITIONS.tag.icon,
	custom: COMPONENT_DEFINITIONS.custom.icon,
};

export function createDefaultComponent(type: ComponentType): Component {
	return COMPONENT_DEFINITIONS[type].create();
}

export function isComponentUnique(type: ComponentType): boolean {
	return COMPONENT_DEFINITIONS[type].unique;
}

export function canAddComponent(components: Component[] | undefined, type: ComponentType): boolean {
	if (!isComponentUnique(type)) return true;
	return !hasComponent(components, type);
}

export function getAvailableLogicComponentTypes(components: Component[] | undefined): ComponentType[] {
	return LOGIC_COMPONENT_ORDER.filter((t) => canAddComponent(components, t));
}

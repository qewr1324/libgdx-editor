/**
 * Type های انیمیشن — کاملاً مستقل از types/scene.ts
 */

export type EasingType = "linear" | "easeIn" | "easeOut" | "easeInOut" | "step";

export interface Keyframe {
	time: number; // ms
	value: number | string | boolean;
	easing: EasingType;
}

export type AnimatableProperty = "transform.x" | "transform.y" | "transform.width" | "transform.height" | "transform.rotation" | "transform.scaleX" | "transform.scaleY" | "transform.originX" | "transform.originY" | "color" | "opacity" | "visible";

export interface Track {
	objectId: string;
	property: AnimatableProperty;
	keyframes: Keyframe[];
}

export interface Animation {
	version: string;
	name: string;
	sourceScene: string; // نام فایل .lgdx.json (بدون مسیر)
	targetObjectId?: string; // اگر انیمیشن برای یک آبجکت مشخصه
	duration: number; // ms
	fps: number;
	loop: boolean;
	autoPlay: boolean;
	tracks: Track[];
}

export const DEFAULT_ANIMATION: Animation = {
	version: "1.0",
	name: "new_animation",
	sourceScene: "",
	duration: 1000,
	fps: 30,
	loop: true,
	autoPlay: false,
	tracks: [],
};

export const ANIMATABLE_PROPERTIES: AnimatableProperty[] = ["transform.x", "transform.y", "transform.width", "transform.height", "transform.rotation", "transform.scaleX", "transform.scaleY", "transform.originX", "transform.originY", "color", "opacity", "visible"];

export const EASING_OPTIONS: EasingType[] = ["linear", "easeIn", "easeOut", "easeInOut", "step"];

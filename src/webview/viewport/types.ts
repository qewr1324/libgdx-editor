import type { GameObject } from "../../types/scene.js";

export type InteractionMode = "idle" | "drag" | "resize" | "rotate" | "marquee";

export type HandleType = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export interface StartTransform {
	x: number;
	y: number;
	w: number;
	h: number;
	r: number;
}

export interface InteractionData {
	startWorldX: number;
	startWorldY: number;
	startTransforms: Map<string, StartTransform>;
	primaryObj: GameObject;
	resizeHandle?: HandleType;
	rotateStartAngle?: number;
	rotateStartRotation?: number;
	rotateCenter?: { x: number; y: number };
	rotateRadius?: number;
}

export interface VsCodeApi {
	postMessage(msg: unknown): void;
	getState(): unknown;
	setState(state: unknown): void;
}

declare global {
	function acquireVsCodeApi(): VsCodeApi;
}

export const vscode = acquireVsCodeApi();

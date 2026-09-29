import type { Application, Container, Texture } from "pixi.js";
import type { Viewport } from "pixi-viewport";
import type { GameObject, Scene } from "../../types/scene.js";
import type { InteractionData, InteractionMode } from "./types.js";

export let scene: Scene | null = null;
export function setScene(newScene: Scene | null): void {
	scene = newScene;
}

export let selectedIds: string[] = [];
export let primarySelectedId: string | null = null;
export function setSelectedIds(ids: string[]): void {
	selectedIds = ids;
}
export function setPrimarySelectedId(id: string | null): void {
	primarySelectedId = id;
}

export let clipboard: GameObject[] = [];
export function setClipboard(items: GameObject[]): void {
	clipboard = items;
}

export let interactionMode: InteractionMode = "idle";
export function setInteractionMode(mode: InteractionMode): void {
	interactionMode = mode;
}

export let currentInteraction: InteractionData | null = null;
export function setCurrentInteraction(data: InteractionData | null): void {
	currentInteraction = data;
}

export let isFinishingInteraction = false;
export function setIsFinishingInteraction(value: boolean): void {
	isFinishingInteraction = value;
}

export let app: Application;
export function setApp(application: Application): void {
	app = application;
}

export let viewport: Viewport;
export function setViewport(v: Viewport): void {
	viewport = v;
}

export let gridLayer: Container;
export function setGridLayer(layer: Container): void {
	gridLayer = layer;
}

export let contentLayer: Container;
export function setContentLayer(layer: Container): void {
	contentLayer = layer;
}

export let selectionLayer: Container;
export function setSelectionLayer(layer: Container): void {
	selectionLayer = layer;
}

export let gizmoLayer: Container;
export function setGizmoLayer(layer: Container): void {
	gizmoLayer = layer;
}

export const objectSprites = new Map<string, Container>();
export const textureCache = new Map<string, Texture>();

export let mouseWorldX = 0;
export let mouseWorldY = 0;
export function setMouseWorld(x: number, y: number): void {
	mouseWorldX = x;
	mouseWorldY = y;
}

export let rulerInfo: HTMLDivElement | null = null;
export function setRulerInfo(el: HTMLDivElement | null): void {
	rulerInfo = el;
}

export let rulerH: HTMLCanvasElement | null = null;
export function setRulerH(el: HTMLCanvasElement | null): void {
	rulerH = el;
}

export let rulerV: HTMLCanvasElement | null = null;
export function setRulerV(el: HTMLCanvasElement | null): void {
	rulerV = el;
}

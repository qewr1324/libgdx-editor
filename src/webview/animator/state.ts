import type { Animation } from "../../animator/animatorConfig.js";
import type { Scene } from "../../types/scene.js";
import type { ObjectInfo } from "./protocol.js";

export let animation: Animation | null = null;
export let scene: Scene | null = null;
export let sceneName: string | null = null;
export let objects: ObjectInfo[] = [];
export let filePath: string | null = null;

// ✅ آبجکت انتخاب‌شده برای انیمیت
export let selectedObjectId: string | null = null;

// Playback
export let playing = false;
export let currentTime = 0;
export let selectedTrackIndex = -1;
export let selectedKeyframeIndex = -1;

// Pixi
export let pixiApp: any = null;
export let viewport: any = null;

export function setAnimation(a: Animation | null): void {
	animation = a;
}

export function setScene(s: Scene | null): void {
	scene = s;
}

export function setSceneName(n: string | null): void {
	sceneName = n;
}

export function setObjects(o: ObjectInfo[]): void {
	objects = o;
}

export function setFilePath(p: string | null): void {
	filePath = p;
}

export function setSelectedObjectId(id: string | null): void {
	selectedObjectId = id;
}

export function setPlaying(p: boolean): void {
	playing = p;
}

export function setCurrentTime(t: number): void {
	currentTime = t;
}

export function setSelectedTrackIndex(i: number): void {
	selectedTrackIndex = i;
}

export function setSelectedKeyframeIndex(i: number): void {
	selectedKeyframeIndex = i;
}

export function setPixiApp(app: any): void {
	pixiApp = app;
}

export function setViewport(v: any): void {
	viewport = v;
}

// src/webview/inspector/types.ts
import type { GameObject, Scene } from "../../types/scene.js";
import type { LibGdxEditorConfigMessage } from "../../protocol/messages.js";

export interface VsCodeApi {
	postMessage(msg: unknown): void;
	getState(): unknown;
	setState(state: unknown): void;
}

export declare function acquireVsCodeApi(): VsCodeApi;

export interface MultiSelection {
	count: number;
	ids: string[];
}

export interface LayerInfo {
	id: string;
	name: string;
}

export interface AtlasRegionInfo {
	name: string;
	x: number;
	y: number;
	width: number;
	height: number;
	rotate: boolean;
	index: number;
}

export type { GameObject, Scene, LibGdxEditorConfigMessage };

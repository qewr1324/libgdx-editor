// src/webview/inspector/vscode-api.ts
import type { VsCodeApi } from "./types.js";

declare function acquireVsCodeApi(): VsCodeApi;

export const vscode = acquireVsCodeApi();

let _app: HTMLElement | null = null;
export function getApp(): HTMLElement {
	if (!_app) {
		const el = document.getElementById("app");
		if (!el) throw new Error("Inspector: #app not found");
		_app = el;
	}
	return _app;
}

export const app: HTMLElement = new Proxy({} as HTMLElement, {
	get(_t, prop, receiver) {
		return Reflect.get(getApp(), prop, receiver);
	},
	set(_t, prop, value) {
		return Reflect.set(getApp(), prop, value);
	},
});

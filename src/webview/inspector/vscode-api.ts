// src/webview/inspector/vscode-api.ts
import type { VsCodeApi } from "./types.js";

declare function acquireVsCodeApi(): VsCodeApi;

export const vscode = acquireVsCodeApi();

// Lazy getter — اگه در زمان import DOM آماده نبود، بعداً می‌گیریمش
let _app: HTMLElement | null = null;
export function getApp(): HTMLElement {
	if (!_app) {
		const el = document.getElementById("app");
		if (!el) throw new Error("Inspector: #app element not found");
		_app = el;
	}
	return _app;
}

// سازگاری با کدهای موجود: app به‌عنوان getter export میشه
// ولی به‌صورت مستقیم قابل استفاده نیست چون getter نیست.
// پس یه proxy ساده می‌سازیم که به getApp() وصله.
export const app: HTMLElement = new Proxy({} as HTMLElement, {
	get(_target, prop, receiver) {
		return Reflect.get(getApp(), prop, receiver);
	},
	set(_target, prop, value) {
		return Reflect.set(getApp(), prop, value);
	},
});

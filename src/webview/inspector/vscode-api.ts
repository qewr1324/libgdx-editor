// src/webview/inspector/vscode-api.ts
import type { VsCodeApi } from "./types.js";

declare function acquireVsCodeApi(): VsCodeApi;

export const vscode = acquireVsCodeApi();
export const app = document.getElementById("app")!;

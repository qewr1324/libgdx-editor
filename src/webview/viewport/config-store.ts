import type { LibGdxEditorConfigMessage } from "../../protocol/messages.js";

let currentConfig: LibGdxEditorConfigMessage | null = null;
const listeners = new Set<(config: LibGdxEditorConfigMessage) => void>();

export function setConfig(config: LibGdxEditorConfigMessage): void {
	currentConfig = config;
	for (const listener of listeners) {
		try {
			listener(config);
		} catch (err) {
			console.error("[config-store] listener error:", err);
		}
	}
}

export function getConfig(): LibGdxEditorConfigMessage | null {
	return currentConfig;
}

export function onConfigChange(handler: (config: LibGdxEditorConfigMessage) => void): () => void {
	listeners.add(handler);
	return () => listeners.delete(handler);
}

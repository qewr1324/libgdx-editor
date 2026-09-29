let debugEnabled = false;

export function setDebugEnabled(enabled: boolean): void {
	debugEnabled = enabled;
}

export function isDebugEnabled(): boolean {
	return debugEnabled;
}

export const log = {
	debug(...args: unknown[]): void {
		if (debugEnabled) console.log("[libgdx-editor]", ...args);
	},
	info(...args: unknown[]): void {
		if (debugEnabled) console.log("[libgdx-editor]", ...args);
	},
	warn(...args: unknown[]): void {
		console.warn("[libgdx-editor]", ...args);
	},
	error(...args: unknown[]): void {
		console.error("[libgdx-editor]", ...args);
	},
};

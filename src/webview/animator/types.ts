export interface VsCodeApi {
	postMessage(msg: unknown): void;
	getState(): unknown;
	setState(state: unknown): void;
}

declare global {
	function acquireVsCodeApi(): VsCodeApi;
}

export const vscode: VsCodeApi = acquireVsCodeApi();

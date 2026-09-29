import { initPreviewPixi } from "../render/pixi-setup.js";
import { renderAtTime } from "../render/scene-player.js";

export async function setupPreviewPanel(container: HTMLElement): Promise<void> {
	container.innerHTML = `<div id="preview-canvas" class="preview-canvas"></div>`;
	const canvasHost = container.querySelector<HTMLDivElement>("#preview-canvas")!;
	await initPreviewPixi(canvasHost);
}

export function refreshPreview(timeMs: number): void {
	renderAtTime(timeMs);
}

import { Application, Container } from "pixi.js";
import { Viewport } from "pixi-viewport";
import { setPixiApp, setViewport } from "../state.js";

export interface PreviewLayers {
	contentLayer: Container;
	gizmoLayer: Container;
}

let layers: PreviewLayers | null = null;

export async function initPreviewPixi(container: HTMLElement): Promise<void> {
	const app = new Application();

	await app.init({
		background: "#1a1a1a",
		resizeTo: container,
		antialias: true,
		autoDensity: true,
		resolution: window.devicePixelRatio || 1,
		preference: "webgl",
	});

	container.appendChild(app.canvas);
	setPixiApp(app);

	const viewport = new Viewport({
		screenWidth: container.clientWidth,
		screenHeight: container.clientHeight,
		worldWidth: 10000,
		worldHeight: 10000,
		events: app.renderer.events,
	});

	app.stage.addChild(viewport);
	viewport.pinch().wheel({ smooth: 5, percent: 0.1 }).decelerate();
	viewport.drag({ mouseButtons: "middle" });

	const contentLayer = new Container();
	const gizmoLayer = new Container();
	viewport.addChild(contentLayer);
	viewport.addChild(gizmoLayer);

	layers = { contentLayer, gizmoLayer };
	setViewport(viewport);
}

export function getLayers(): PreviewLayers | null {
	return layers;
}

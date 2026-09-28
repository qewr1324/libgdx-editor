import { Application, Container } from "pixi.js";
import { Viewport } from "pixi-viewport";
import { setApp, setViewport, setGridLayer, setContentLayer, setSelectionLayer, setGizmoLayer } from "../state.js";
import { setupGlobalInteractionListeners } from "../interaction/global.js";

export async function initPixi(): Promise<void> {
	const app = new Application();

	await app.init({
		background: "#1a1a1a",
		resizeTo: window,
		antialias: true,
		autoDensity: true,
		resolution: window.devicePixelRatio || 1,
		preference: "webgl",
	});

	document.getElementById("app")!.appendChild(app.canvas);
	setApp(app);

	const viewport = new Viewport({
		screenWidth: window.innerWidth,
		screenHeight: window.innerHeight,
		worldWidth: 10000,
		worldHeight: 10000,
		events: app.renderer.events,
	});

	app.stage.addChild(viewport);
	viewport.drag().pinch().wheel().decelerate();
	setViewport(viewport);

	const gridLayer = new Container();
	const contentLayer = new Container();
	const selectionLayer = new Container();
	const gizmoLayer = new Container();

	viewport.addChild(gridLayer);
	viewport.addChild(contentLayer);
	viewport.addChild(selectionLayer);
	viewport.addChild(gizmoLayer);

	setGridLayer(gridLayer);
	setContentLayer(contentLayer);
	setSelectionLayer(selectionLayer);
	setGizmoLayer(gizmoLayer);

	// fallback: PixiJS هم pointerup را بگیرد
	app.stage.eventMode = "static";
	app.stage.on("pointerup", () => {
		void import("../interaction/global.js").then((m) => m.finishInteractionSafely());
	});
	app.stage.on("pointerupoutside", () => {
		void import("../interaction/global.js").then((m) => m.finishInteractionSafely());
	});

	// global interaction listeners
	setupGlobalInteractionListeners();
}

import { Application, Container } from "pixi.js";
import { Viewport } from "pixi-viewport";
import { setApp, setViewport, setGridLayer, setContentLayer, setSelectionLayer, setGizmoLayer } from "../state.js";
import { setupGlobalInteractionListeners, finishInteractionSafely } from "../interaction/global.js";

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

	// ✅ فقط wheel + pinch + decelerate — بدون drag پیش‌فرض
	viewport.pinch().wheel({ smooth: 5, percent: 0.1 }).decelerate();

	// ✅ drag فقط با دکمه‌ی وسط موس
	viewport.drag({
		mouseButtons: "middle",
	});

	// اختیاری: با دکمه‌ی راست هم drag نشه
	// (right-click برای context menu استفاده می‌شه)

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

	app.stage.eventMode = "static";
	app.stage.on("pointerup", () => {
		finishInteractionSafely();
	});
	app.stage.on("pointerupoutside", () => {
		finishInteractionSafely();
	});

	setupGlobalInteractionListeners();
}

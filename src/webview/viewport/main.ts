import { Application, Container, Graphics, Rectangle, Text, TextStyle } from "pixi.js";
import { Viewport } from "pixi-viewport";
import type { Scene, GameObject } from "../../types/scene.js";

interface VsCodeApi {
	postMessage(msg: unknown): void;
	getState(): unknown;
	setState(state: unknown): void;
}
declare function acquireVsCodeApi(): VsCodeApi;

const vscode = acquireVsCodeApi();

// ---------- State ----------
let scene: Scene | null = null;
let selectedId: string | null = null;

// ---------- Pixi setup ----------
const app = new Application();

let viewport: Viewport;
let gridLayer: Container;
let contentLayer: Container;
let selectionLayer: Container;
const objectSprites = new Map<string, Container>();

async function initPixi() {
	await app.init({
		background: "#1a1a1a",
		resizeTo: window,
		antialias: true,
		autoDensity: true,
		resolution: window.devicePixelRatio || 1,
	});

	document.getElementById("app")!.appendChild(app.canvas);

	viewport = new Viewport({
		screenWidth: window.innerWidth,
		screenHeight: window.innerHeight,
		worldWidth: 10000,
		worldHeight: 10000,
		events: app.renderer.events,
	});

	app.stage.addChild(viewport);

	viewport.drag().pinch().wheel().decelerate();

	gridLayer = new Container();
	contentLayer = new Container();
	selectionLayer = new Container();

	viewport.addChild(gridLayer);
	viewport.addChild(contentLayer);
	viewport.addChild(selectionLayer);

	// grid را با تغییر zoom دوباره رسم کن
	viewport.on("zoomed", () => redrawGrid());
}

// ---------- Grid ----------
function redrawGrid() {
	if (!scene) return;
	gridLayer.removeChildren();

	const gridSize = scene.gridSize || 32;
	const worldW = scene.worldSize.width;
	const worldH = scene.worldSize.height;

	// خطوط grid
	const g = new Graphics();

	// خطوط عمودی
	for (let x = 0; x <= worldW; x += gridSize) {
		g.moveTo(x, 0);
		g.lineTo(x, worldH);
	}
	// خطوط افقی
	for (let y = 0; y <= worldH; y += gridSize) {
		g.moveTo(0, y);
		g.lineTo(worldW, y);
	}
	g.stroke({ width: 1, color: 0x2a2a2a, alpha: 0.6 });

	// مرز دنیای بازی
	const border = new Graphics();
	border.rect(0, 0, worldW, worldH);
	border.stroke({ width: 2, color: 0x4a9eff, alpha: 0.8 });

	gridLayer.addChild(g);
	gridLayer.addChild(border);
}

// ---------- Render objects ----------
function renderScene(newScene: Scene) {
	scene = newScene;
	app.renderer.background.color = newScene.backgroundColor || "#1a1a1a";

	contentLayer.removeChildren();
	objectSprites.clear();

	redrawGrid();

	for (const layer of newScene.layers) {
		if (!layer.visible) continue;
		for (const obj of layer.objects) {
			renderObject(obj);
		}
	}
}

function renderObject(obj: GameObject) {
	const container = new Container();
	const t = obj.transform;

	// رسم sprite (فعلاً فقط شکل رنگی)
	const g = new Graphics();
	const color = obj.color ? parseInt(obj.color.replace("#", "0x")) : 0x4a9eff;

	if (obj.type === "sprite") {
		g.rect(0, 0, t.width, t.height);
		g.fill({ color, alpha: 1 });
		g.stroke({ width: 1, color: 0x000000, alpha: 0.4 });
	} else if (obj.type === "shape") {
		g.circle(t.width / 2, t.height / 2, Math.min(t.width, t.height) / 2);
		g.fill({ color, alpha: 1 });
	} else if (obj.type === "text") {
		const txt = new Text({
			text: obj.name,
			style: new TextStyle({ fill: "#ffffff", fontSize: 14 }),
		});
		container.addChild(txt);
	} else {
		// group
		g.rect(0, 0, t.width, t.height);
		g.fill({ color, alpha: 0.3 });
		g.stroke({ width: 1, color, alpha: 1 });
	}

	if (obj.type !== "text") {
		container.addChild(g);
	}

	container.x = t.x;
	container.y = t.y;
	container.rotation = (t.rotation * Math.PI) / 180;
	container.scale.set(t.scaleX, t.scaleY);
	container.pivot.set(t.width * t.originX, t.height * t.originY);

	container.eventMode = "static";
	container.cursor = "pointer";
	container.on("pointerdown", (e) => {
		e.stopPropagation();
		selectObject(obj.id);
	});

	contentLayer.addChild(container);
	objectSprites.set(obj.id, container);
}

// ---------- Selection ----------
function selectObject(id: string | null) {
	selectedId = id;
	selectionLayer.removeChildren();

	if (id) {
		const container = objectSprites.get(id);
		if (container) {
			const t = scene ? findObject(scene, id)?.transform : null;
			if (t) {
				const outline = new Graphics();
				outline.rect(-t.width * t.originX - 2, -t.height * t.originY - 2, t.width + 4, t.height + 4);
				outline.stroke({ width: 2, color: 0xffaa00, alpha: 1 });
				outline.x = t.x;
				outline.y = t.y;
				outline.rotation = container.rotation;
				outline.scale.copyFrom(container.scale);
				selectionLayer.addChild(outline);
			}
		}
	}

	vscode.postMessage({ type: "selectObject", objectId: id });
}

function findObject(s: Scene, id: string): GameObject | null {
	for (const layer of s.layers) {
		for (const obj of layer.objects) {
			if (obj.id === id) return obj;
		}
	}
	return null;
}

// کلیک روی فضای خالی → deselect
function setupDeselect() {
	app.stage.eventMode = "static";
	app.stage.hitArea = new Rectangle(0, 0, window.innerWidth, window.innerHeight);
	app.stage.on("pointerdown", () => {
		selectObject(null);
	});
}

// ---------- Resize ----------
window.addEventListener("resize", () => {
	if (viewport) {
		viewport.resize(window.innerWidth, window.innerHeight);
	}
});

// ---------- Messages ----------
window.addEventListener("message", (event) => {
	const msg = event.data;
	switch (msg.type) {
		case "load":
		case "update":
			renderScene(msg.scene);
			break;
		case "selectFromOutliner":
			selectObject(msg.objectId);
			if (msg.objectId && viewport) {
				const obj = scene ? findObject(scene, msg.objectId) : null;
				if (obj) {
					viewport.moveCenter(obj.transform.x, obj.transform.y);
				}
			}
			break;
	}
});

// ---------- Boot ----------
(async () => {
	await initPixi();
	setupDeselect();
	vscode.postMessage({ type: "ready" });
})();

import "pixi.js/unsafe-eval";

import { Application, Container, Graphics, Rectangle, Text, TextStyle } from "pixi.js";
import { Viewport } from "pixi-viewport";
import type { GameObject, Scene } from "../../types/scene.js";

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
let isDraggingObject = false;

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
		preference: "webgl",
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

	viewport.on("zoomed", () => redrawGrid());

	setupToolbar();
}

// ---------- Toolbar ----------
function setupToolbar() {
	const toolbar = document.createElement("div");
	toolbar.id = "toolbar";
	toolbar.innerHTML = `
		<button data-action="add-sprite" title="Add Sprite">➕ Sprite</button>
		<button data-action="add-shape" title="Add Shape">⭕ Shape</button>
		<button data-action="add-text" title="Add Text">🔤 Text</button>
		<button data-action="delete" title="Delete Selected">🗑️ Delete</button>
		<button data-action="save" title="Save (Ctrl+S)">💾 Save</button>
		<span id="toolbar-info"></span>
	`;
	document.body.appendChild(toolbar);

	toolbar.addEventListener("click", (e) => {
		const target = e.target as HTMLButtonElement;
		const action = target.dataset.action;
		if (!action) return;

		switch (action) {
			case "add-sprite":
				addObject("sprite");
				break;
			case "add-shape":
				addObject("shape");
				break;
			case "add-text":
				addObject("text");
				break;
			case "delete":
				if (selectedId) {
					vscode.postMessage({ type: "deleteObject", objectId: selectedId });
					selectObject(null);
				}
				break;
			case "save":
				if (scene) {
					vscode.postMessage({ type: "save", scene });
					updateToolbarInfo("Saved ✓");
					setTimeout(() => updateToolbarInfo(""), 1500);
				}
				break;
		}
	});

	// Ctrl+S → ذخیره
	window.addEventListener("keydown", (e) => {
		if ((e.ctrlKey || e.metaKey) && e.key === "s") {
			e.preventDefault();
			if (scene) {
				vscode.postMessage({ type: "save", scene });
				updateToolbarInfo("Saved ✓");
				setTimeout(() => updateToolbarInfo(""), 1500);
			}
		}
		// Delete key → حذف انتخاب
		if (e.key === "Delete" && selectedId) {
			vscode.postMessage({ type: "deleteObject", objectId: selectedId });
			selectObject(null);
		}
	});
}

function updateToolbarInfo(text: string) {
	const el = document.getElementById("toolbar-info");
	if (el) el.textContent = text;
}

function addObject(type: GameObject["type"]) {
	if (!viewport) return;
	// در مرکز viewport آبجکت بساز
	const center = viewport.center;
	vscode.postMessage({
		type: "requestAddObject",
		objectType: type,
		x: Math.round(center.x),
		y: Math.round(center.y),
	});
}

// ---------- Grid ----------
function redrawGrid() {
	if (!scene) return;
	gridLayer.removeChildren();

	const gridSize = scene.gridSize || 32;
	const worldW = scene.worldSize.width;
	const worldH = scene.worldSize.height;

	const g = new Graphics();

	for (let x = 0; x <= worldW; x += gridSize) {
		g.moveTo(x, 0);
		g.lineTo(x, worldH);
	}
	for (let y = 0; y <= worldH; y += gridSize) {
		g.moveTo(0, y);
		g.lineTo(worldW, y);
	}
	g.stroke({ width: 1, color: 0x3a3a3a, alpha: 0.7 });

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

	// اگر انتخاب قبلی هنوز معتبر است، دوباره رسم کن
	if (selectedId) {
		selectObject(selectedId);
	}
}

function renderObject(obj: GameObject) {
	const container = new Container();
	const t = obj.transform;

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
			style: new TextStyle({ fill: obj.color || "#ffffff", fontSize: 16 }),
		});
		container.addChild(txt);
	} else {
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

		// شروع درگ
		isDraggingObject = true;
		const startPos = e.global.clone();
		const startX = obj.transform.x;
		const startY = obj.transform.y;

		const onMove = (moveEvent: any) => {
			if (!isDraggingObject || !viewport) return;
			const dx = (moveEvent.global.x - startPos.x) / viewport.scale.x;
			const dy = (moveEvent.global.y - startPos.y) / viewport.scale.y;
			const newX = Math.round(startX + dx);
			const newY = Math.round(startY + dy);

			container.x = newX;
			container.y = newY;

			if (scene) {
				const objInScene = findObject(scene, obj.id);
				if (objInScene) {
					objInScene.transform.x = newX;
					objInScene.transform.y = newY;
				}
			}

			drawSelectionOutline();
		};

		const onUp = () => {
			isDraggingObject = false;
			app.stage.off("pointermove", onMove);
			app.stage.off("pointerup", onUp);
			app.stage.off("pointerupoutside", onUp);

			if (scene) {
				const objInScene = findObject(scene, obj.id);
				if (objInScene) {
					vscode.postMessage({ type: "updateObject", object: objInScene });
				}
			}
		};

		app.stage.on("pointermove", onMove);
		app.stage.on("pointerup", onUp);
		app.stage.on("pointerupoutside", onUp);
	});

	contentLayer.addChild(container);
	objectSprites.set(obj.id, container);
}

// ---------- Selection ----------
function selectObject(id: string | null) {
	selectedId = id;
	drawSelectionOutline();

	if (id) {
		const obj = scene ? findObject(scene, id) : null;
		if (obj) {
			updateToolbarInfo(`Selected: ${obj.name}`);
		}
	} else {
		updateToolbarInfo("");
	}

	vscode.postMessage({ type: "selectObject", objectId: id });
}

function drawSelectionOutline() {
	selectionLayer.removeChildren();
	if (!selectedId || !scene) return;

	const obj = findObject(scene, selectedId);
	if (!obj) return;

	const t = obj.transform;
	const outline = new Graphics();
	outline.rect(-t.width * t.originX - 3, -t.height * t.originY - 3, t.width + 6, t.height + 6);
	outline.stroke({ width: 2, color: 0xffaa00, alpha: 1 });

	outline.x = t.x;
	outline.y = t.y;
	outline.rotation = (t.rotation * Math.PI) / 180;
	outline.scale.set(t.scaleX, t.scaleY);

	selectionLayer.addChild(outline);

	// نقاط گوشه
	const handles = new Graphics();
	const hw = 6;
	const positions = [
		[-t.width * t.originX, -t.height * t.originY],
		[t.width * (1 - t.originX), -t.height * t.originY],
		[t.width * (1 - t.originX), t.height * (1 - t.originY)],
		[-t.width * t.originX, t.height * (1 - t.originY)],
	];
	for (const [hx, hy] of positions) {
		handles.rect(hx - hw / 2, hy - hw / 2, hw, hw);
	}
	handles.fill({ color: 0xffaa00 });
	handles.x = t.x;
	handles.y = t.y;
	handles.rotation = outline.rotation;
	handles.scale.copyFrom(outline.scale);
	selectionLayer.addChild(handles);
}

function findObject(s: Scene, id: string): GameObject | null {
	for (const layer of s.layers) {
		for (const obj of layer.objects) {
			if (obj.id === id) return obj;
		}
	}
	return null;
}

function setupDeselect() {
	app.stage.eventMode = "static";
	app.stage.hitArea = new Rectangle(0, 0, window.innerWidth, window.innerHeight);
	app.stage.on("pointerdown", () => {
		if (!isDraggingObject) {
			selectObject(null);
		}
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
		case "selectObject":
			if (msg.objectId !== selectedId) {
				selectObject(msg.objectId);
			}
			break;
		case "focusObject":
			if (viewport) {
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

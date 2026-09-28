import "pixi.js/unsafe-eval";

import { Application, Assets, Container, Graphics, Rectangle, Sprite, Text, TextStyle, Texture } from "pixi.js";
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
let selectedIds: string[] = [];
let primarySelectedId: string | null = null;
let isDraggingObject = false;
let isResizing = false;

const textureCache = new Map<string, Texture>();

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

	setupToolbar();
	setupContextMenu();
}

// ---------- Toolbar ----------
function setupToolbar() {
	const toolbar = document.createElement("div");
	toolbar.id = "toolbar";
	toolbar.innerHTML = `
		<button data-action="add-sprite" title="Add Sprite">➕ Sprite</button>
		<button data-action="add-shape" title="Add Shape">⭕ Shape</button>
		<button data-action="add-text" title="Add Text">🔤 Text</button>
		<button data-action="add-texture" title="Add Texture from file">🖼️ Texture</button>
		<button data-action="delete" title="Delete Selected">🗑️ Delete</button>
		<button data-action="snap-grid" title="Snap to Grid">▦ Grid</button>
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
			case "add-texture":
				addTexture();
				break;
			case "delete":
				if (selectedIds.length > 0) {
					vscode.postMessage({ type: "deleteObjects", objectIds: selectedIds });
					selectObjects([]);
				}
				break;
			case "snap-grid":
				if (scene) {
					scene.snapToGrid = !scene.snapToGrid;
					target.classList.toggle("active", scene.snapToGrid);
					vscode.postMessage({ type: "updateSceneField", field: "snapToGrid", value: scene.snapToGrid });
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

	window.addEventListener("keydown", (e) => {
		if ((e.ctrlKey || e.metaKey) && e.key === "s") {
			e.preventDefault();
			if (scene) {
				vscode.postMessage({ type: "save", scene });
				updateToolbarInfo("Saved ✓");
				setTimeout(() => updateToolbarInfo(""), 1500);
			}
		}
		if (e.key === "Delete" && selectedIds.length > 0) {
			vscode.postMessage({ type: "deleteObjects", objectIds: selectedIds });
			selectObjects([]);
		}
		if (e.key === "Escape") {
			selectObjects([]);
		}
	});
}

// ---------- Context Menu (Right-click) ----------
function setupContextMenu() {
	const menu = document.createElement("div");
	menu.id = "context-menu";
	menu.innerHTML = `
		<div class="context-menu-item" data-action="scene-settings">⚙️ Scene Settings</div>
		<div class="context-menu-separator"></div>
		<div class="context-menu-item" data-action="add-sprite-here">➕ Add Sprite Here</div>
		<div class="context-menu-item" data-action="add-shape-here">⭕ Add Shape Here</div>
		<div class="context-menu-item" data-action="add-text-here">🔤 Add Text Here</div>
		<div class="context-menu-item" data-action="add-texture-here">🖼️ Add Texture Here</div>
	`;
	menu.style.display = "none";
	document.body.appendChild(menu);

	let contextWorldX = 0;
	let contextWorldY = 0;

	app.canvas.addEventListener("contextmenu", (e) => {
		e.preventDefault();
		if (!viewport) return;

		// موقعیت در world coordinates
		const rect = app.canvas.getBoundingClientRect();
		const screenX = e.clientX - rect.left;
		const screenY = e.clientY - rect.top;
		const world = viewport.toWorld(screenX, screenY);
		contextWorldX = Math.round(world.x);
		contextWorldY = Math.round(world.y);

		menu.style.left = `${e.clientX}px`;
		menu.style.top = `${e.clientY}px`;
		menu.style.display = "block";
	});

	document.addEventListener("click", (e) => {
		if (!menu.contains(e.target as Node)) {
			menu.style.display = "none";
		}
	});

	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape") {
			menu.style.display = "none";
		}
	});

	menu.addEventListener("click", (e) => {
		const target = e.target as HTMLElement;
		const action = target.dataset.action;
		menu.style.display = "none";
		if (!action) return;

		switch (action) {
			case "scene-settings":
				vscode.postMessage({ type: "openSceneSettings" });
				break;
			case "add-sprite-here":
				vscode.postMessage({ type: "requestAddObject", objectType: "sprite", x: contextWorldX, y: contextWorldY });
				break;
			case "add-shape-here":
				vscode.postMessage({ type: "requestAddObject", objectType: "shape", x: contextWorldX, y: contextWorldY });
				break;
			case "add-text-here":
				vscode.postMessage({ type: "requestAddObject", objectType: "text", x: contextWorldX, y: contextWorldY });
				break;
			case "add-texture-here":
				vscode.postMessage({ type: "requestAddTexture", x: contextWorldX, y: contextWorldY });
				break;
		}
	});
}

function updateToolbarInfo(text: string) {
	const el = document.getElementById("toolbar-info");
	if (el) el.textContent = text;
}

function addObject(type: GameObject["type"]) {
	if (!viewport) return;
	const center = viewport.center;
	vscode.postMessage({
		type: "requestAddObject",
		objectType: type,
		x: Math.round(center.x),
		y: Math.round(center.y),
	});
}

function addTexture() {
	if (!viewport) return;
	const center = viewport.center;
	vscode.postMessage({
		type: "requestAddTexture",
		x: Math.round(center.x),
		y: Math.round(center.y),
	});
}

// ---------- Grid (فقط یک‌بار رسم می‌شود) ----------
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

// ---------- Textures ----------
async function loadTexture(path: string, dataUrl: string): Promise<Texture> {
	if (textureCache.has(path)) return textureCache.get(path)!;
	const texture = await Assets.load<Texture>(dataUrl);
	textureCache.set(path, texture);
	return texture;
}

// ---------- Render ----------
function renderScene(newScene: Scene) {
	scene = newScene;
	app.renderer.background.color = newScene.backgroundColor || "#1a1a1a";

	contentLayer.removeChildren();
	objectSprites.clear();

	redrawGrid();

	for (const layer of newScene.layers) {
		if (!layer.visible) continue;
		for (const obj of layer.objects) {
			renderObject(obj, layer.locked ?? false);
		}
	}

	if (selectedIds.length > 0) {
		drawSelectionOutlines();
	}
}

function renderObject(obj: GameObject, layerLocked = false) {
	const container = new Container();
	const t = obj.transform;

	if (obj.type === "sprite" && obj.texture && textureCache.has(obj.texture)) {
		const texture = textureCache.get(obj.texture)!;
		const sprite = new Sprite(texture);
		sprite.width = t.width;
		sprite.height = t.height;
		container.addChild(sprite);
	} else if (obj.type === "sprite") {
		const g = new Graphics();
		const color = obj.color ? parseInt(obj.color.replace("#", "0x")) : 0x4a9eff;
		g.rect(0, 0, t.width, t.height);
		g.fill({ color, alpha: 1 });
		g.stroke({ width: 1, color: 0x000000, alpha: 0.4 });
		container.addChild(g);
	} else if (obj.type === "shape") {
		const g = new Graphics();
		const color = obj.color ? parseInt(obj.color.replace("#", "0x")) : 0xff4a4a;
		g.circle(t.width / 2, t.height / 2, Math.min(t.width, t.height) / 2);
		g.fill({ color, alpha: 1 });
		container.addChild(g);
	} else if (obj.type === "text") {
		const txt = new Text({
			text: obj.name,
			style: new TextStyle({ fill: obj.color || "#ffffff", fontSize: 16 }),
		});
		container.addChild(txt);
	} else {
		const g = new Graphics();
		const color = obj.color ? parseInt(obj.color.replace("#", "0x")) : 0x9b59b6;
		g.rect(0, 0, t.width, t.height);
		g.fill({ color, alpha: 0.3 });
		g.stroke({ width: 1, color, alpha: 1 });
		container.addChild(g);
	}

	container.x = t.x;
	container.y = t.y;
	container.rotation = (t.rotation * Math.PI) / 180;
	container.scale.set(t.scaleX, t.scaleY);
	container.pivot.set(t.width * t.originX, t.height * t.originY);

	container.eventMode = "static";
	container.cursor = layerLocked ? "not-allowed" : "pointer";

	if (!layerLocked) {
		container.on("pointerdown", (e) => {
			e.stopPropagation();

			const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;

			if (isMulti) {
				const idx = selectedIds.indexOf(obj.id);
				if (idx !== -1) {
					selectedIds = selectedIds.filter((id) => id !== obj.id);
					if (primarySelectedId === obj.id) {
						primarySelectedId = selectedIds[selectedIds.length - 1] ?? null;
					}
				} else {
					selectedIds = [...selectedIds, obj.id];
					primarySelectedId = obj.id;
				}
				selectObjects(selectedIds, primarySelectedId);
			} else {
				if (!selectedIds.includes(obj.id)) {
					selectObjects([obj.id], obj.id);
				}
			}

			startDrag(e, obj);
		});
	}

	contentLayer.addChild(container);
	objectSprites.set(obj.id, container);
}

// ---------- Drag with Snap to Grid only ----------
function startDrag(e: any, primaryObj: GameObject) {
	isDraggingObject = true;

	const startPos = e.global.clone();
	const startTransforms = new Map<string, { x: number; y: number }>();

	for (const id of selectedIds) {
		const o = scene ? findObject(scene, id) : null;
		if (o) {
			startTransforms.set(id, { x: o.transform.x, y: o.transform.y });
		}
	}
	if (startTransforms.size === 0) {
		startTransforms.set(primaryObj.id, { x: primaryObj.transform.x, y: primaryObj.transform.y });
	}

	const onMove = (moveEvent: any) => {
		if (!isDraggingObject || !viewport || !scene) return;
		const dx = (moveEvent.global.x - startPos.x) / viewport.scale.x;
		const dy = (moveEvent.global.y - startPos.y) / viewport.scale.y;

		const primaryStart = startTransforms.get(primaryObj.id)!;
		let newPrimaryX = primaryStart.x + dx;
		let newPrimaryY = primaryStart.y + dy;

		if (scene.snapToGrid) {
			const g = scene.gridSize || 32;
			newPrimaryX = Math.round(newPrimaryX / g) * g;
			newPrimaryY = Math.round(newPrimaryY / g) * g;
		}

		const snapDX = newPrimaryX - (primaryStart.x + dx);
		const snapDY = newPrimaryY - (primaryStart.y + dy);

		for (const [id, start] of startTransforms) {
			const obj = scene ? findObject(scene, id) : null;
			if (!obj) continue;
			const newX = Math.round(start.x + dx + snapDX);
			const newY = Math.round(start.y + dy + snapDY);
			obj.transform.x = newX;
			obj.transform.y = newY;

			const c = objectSprites.get(id);
			if (c) {
				c.x = newX;
				c.y = newY;
			}
		}

		drawSelectionOutlines();
	};

	const onUp = () => {
		isDraggingObject = false;
		app.stage.off("pointermove", onMove);
		app.stage.off("pointerup", onUp);
		app.stage.off("pointerupoutside", onUp);

		if (!scene) return;
		const updated: GameObject[] = [];
		for (const id of startTransforms.keys()) {
			const obj = findObject(scene, id);
			if (obj) updated.push(structuredClone(obj) as GameObject);
		}
		if (updated.length > 0) {
			vscode.postMessage({ type: "updateObjects", objects: updated });
		}
	};

	app.stage.on("pointermove", onMove);
	app.stage.on("pointerup", onUp);
	app.stage.on("pointerupoutside", onUp);
}

// ---------- Selection ----------
function selectObjects(ids: string[], primaryId?: string | null) {
	selectedIds = ids;
	primarySelectedId = primaryId ?? (ids.length > 0 ? ids[ids.length - 1] : null);

	drawSelectionOutlines();

	if (ids.length === 0) {
		updateToolbarInfo("");
	} else if (ids.length === 1) {
		const obj = scene ? findObject(scene, ids[0]) : null;
		if (obj) updateToolbarInfo(`Selected: ${obj.name}`);
	} else {
		updateToolbarInfo(`${ids.length} objects selected`);
	}

	vscode.postMessage({ type: "selectObjects", objectIds: ids });
}

// ---------- Selection Outlines + Resize ----------
function drawSelectionOutlines() {
	selectionLayer.removeChildren();
	if (selectedIds.length === 0 || !scene) return;

	for (const id of selectedIds) {
		const obj = findObject(scene, id);
		if (!obj) continue;
		const t = obj.transform;

		const outline = new Graphics();
		outline.rect(-t.width * t.originX - 3, -t.height * t.originY - 3, t.width + 6, t.height + 6);
		outline.stroke({ width: 2, color: 0xffaa00, alpha: 1 });
		outline.x = t.x;
		outline.y = t.y;
		outline.rotation = (t.rotation * Math.PI) / 180;
		outline.scale.set(t.scaleX, t.scaleY);
		selectionLayer.addChild(outline);

		if (selectedIds.length === 1) {
			drawResizeHandles(obj, t);
		} else {
			const dot = new Graphics();
			dot.circle(0, 0, 4);
			dot.fill({ color: 0xffaa00 });
			dot.x = t.x;
			dot.y = t.y;
			selectionLayer.addChild(dot);
		}
	}
}

type HandleType = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

function drawResizeHandles(obj: GameObject, t: GameObject["transform"]) {
	const hw = 8;

	const left = -t.width * t.originX;
	const right = t.width * (1 - t.originX);
	const top = -t.height * t.originY;
	const bottom = t.height * (1 - t.originY);

	const positions: Array<{ type: HandleType; x: number; y: number; cursor: string }> = [
		{ type: "nw", x: left, y: top, cursor: "nwse-resize" },
		{ type: "n", x: (left + right) / 2, y: top, cursor: "ns-resize" },
		{ type: "ne", x: right, y: top, cursor: "nesw-resize" },
		{ type: "e", x: right, y: (top + bottom) / 2, cursor: "ew-resize" },
		{ type: "se", x: right, y: bottom, cursor: "nwse-resize" },
		{ type: "s", x: (left + right) / 2, y: bottom, cursor: "ns-resize" },
		{ type: "sw", x: left, y: bottom, cursor: "nesw-resize" },
		{ type: "w", x: left, y: (top + bottom) / 2, cursor: "ew-resize" },
	];

	for (const pos of positions) {
		const handle = new Graphics();
		handle.rect(-hw / 2, -hw / 2, hw, hw);
		handle.fill({ color: 0xffaa00 });
		handle.stroke({ width: 1, color: 0x1a1a1a, alpha: 0.5 });

		handle.x = t.x + pos.x * t.scaleX;
		handle.y = t.y + pos.y * t.scaleY;

		handle.eventMode = "static";
		handle.cursor = pos.cursor;

		handle.on("pointerdown", (e) => {
			e.stopPropagation();
			startResize(e, obj, pos.type);
		});

		selectionLayer.addChild(handle);
	}
}

function startResize(e: any, obj: GameObject, handle: HandleType) {
	isResizing = true;

	const startPos = e.global.clone();
	const startTransform = { ...obj.transform };

	const onMove = (moveEvent: any) => {
		if (!isResizing || !viewport || !scene) return;

		const dx = (moveEvent.global.x - startPos.x) / viewport.scale.x;
		const dy = (moveEvent.global.y - startPos.y) / viewport.scale.y;

		const shift = moveEvent.shiftKey;
		let newW = startTransform.width;
		let newH = startTransform.height;
		let newX = startTransform.x;
		let newY = startTransform.y;

		switch (handle) {
			case "e":
				newW = Math.max(1, startTransform.width + dx);
				break;
			case "w":
				newW = Math.max(1, startTransform.width - dx);
				newX = startTransform.x + dx / 2;
				break;
			case "s":
				newH = Math.max(1, startTransform.height + dy);
				break;
			case "n":
				newH = Math.max(1, startTransform.height - dy);
				newY = startTransform.y + dy / 2;
				break;
			case "se":
				newW = Math.max(1, startTransform.width + dx);
				newH = Math.max(1, startTransform.height + dy);
				break;
			case "sw":
				newW = Math.max(1, startTransform.width - dx);
				newH = Math.max(1, startTransform.height + dy);
				newX = startTransform.x + dx / 2;
				break;
			case "ne":
				newW = Math.max(1, startTransform.width + dx);
				newH = Math.max(1, startTransform.height - dy);
				newY = startTransform.y + dy / 2;
				break;
			case "nw":
				newW = Math.max(1, startTransform.width - dx);
				newH = Math.max(1, startTransform.height - dy);
				newX = startTransform.x + dx / 2;
				newY = startTransform.y + dy / 2;
				break;
		}

		if (shift) {
			const aspect = startTransform.width / startTransform.height;
			if (newW / newH > aspect) {
				newW = newH * aspect;
			} else {
				newH = newW / aspect;
			}
		}

		if (scene.snapToGrid) {
			const g = scene.gridSize || 32;
			newW = Math.round(newW / g) * g;
			newH = Math.round(newH / g) * g;
			if (handle === "w" || handle === "nw" || handle === "sw") newX = Math.round(newX / g) * g;
			if (handle === "n" || handle === "nw" || handle === "ne") newY = Math.round(newY / g) * g;
		}

		obj.transform.width = Math.round(newW);
		obj.transform.height = Math.round(newH);
		obj.transform.x = Math.round(newX);
		obj.transform.y = Math.round(newY);

		rerenderObject(obj);
		drawSelectionOutlines();
	};

	const onUp = () => {
		isResizing = false;
		app.stage.off("pointermove", onMove);
		app.stage.off("pointerup", onUp);
		app.stage.off("pointerupoutside", onUp);

		vscode.postMessage({ type: "updateObject", object: structuredClone(obj) as GameObject });
	};

	app.stage.on("pointermove", onMove);
	app.stage.on("pointerup", onUp);
	app.stage.on("pointerupoutside", onUp);
}

function rerenderObject(obj: GameObject) {
	const old = objectSprites.get(obj.id);
	if (old) {
		contentLayer.removeChild(old);
		old.destroy({ children: true });
		objectSprites.delete(obj.id);
	}
	const layer = scene?.layers.find((l) => l.objects.some((o) => o.id === obj.id));
	renderObject(obj, layer?.locked ?? false);
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
		if (!isDraggingObject && !isResizing) {
			selectObjects([]);
		}
	});
}

window.addEventListener("resize", () => {
	if (viewport) {
		viewport.resize(window.innerWidth, window.innerHeight);
	}
});

// ---------- Messages ----------
window.addEventListener("message", async (event) => {
	const msg = event.data;
	switch (msg.type) {
		case "load":
		case "update":
			renderScene(msg.scene);
			break;
		case "texturesLoaded": {
			const textures = msg.textures as Record<string, string>;
			for (const [path, dataUrl] of Object.entries(textures)) {
				try {
					await loadTexture(path, dataUrl);
				} catch (err) {
					console.error("Failed to load texture:", path, err);
				}
			}
			if (scene) renderScene(scene);
			break;
		}
		case "selectFromOutliner":
			if (msg.objectId) {
				selectObjects([msg.objectId], msg.objectId);
				const obj = scene ? findObject(scene, msg.objectId) : null;
				if (obj && viewport) {
					viewport.moveCenter(obj.transform.x, obj.transform.y);
				}
			} else {
				selectObjects([]);
			}
			break;
		case "selectObjects":
			if (JSON.stringify(msg.objectIds) !== JSON.stringify(selectedIds)) {
				selectObjects(msg.objectIds, msg.objectIds[msg.objectIds.length - 1] ?? null);
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

(async () => {
	await initPixi();
	setupDeselect();
	vscode.postMessage({ type: "ready" });
})();

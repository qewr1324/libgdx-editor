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
let isRotating = false;
let clipboard: GameObject[] = [];

const textureCache = new Map<string, Texture>();

// ---------- Pixi setup ----------
const app = new Application();

let viewport: Viewport;
let gridLayer: Container;
let contentLayer: Container;
let selectionLayer: Container;
const objectSprites = new Map<string, Container>();

// ---------- Ruler & Cursor state ----------
let mouseWorldX = 0;
let mouseWorldY = 0;
let rulerInfo: HTMLDivElement | null = null;
let rulerH: HTMLCanvasElement | null = null;
let rulerV: HTMLCanvasElement | null = null;

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
	setupRulers();
	setupMouseTracker();
}

// ---------- Toolbar ----------
function setupToolbar() {
	const toolbar = document.createElement("div");
	toolbar.id = "toolbar";
	toolbar.style.top = "22px";
	toolbar.style.left = "22px";
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
		const mod = e.ctrlKey || e.metaKey;

		if (mod && e.key === "s") {
			e.preventDefault();
			if (scene) {
				vscode.postMessage({ type: "save", scene });
				updateToolbarInfo("Saved ✓");
				setTimeout(() => updateToolbarInfo(""), 1500);
			}
		} else if (mod && e.key === "c") {
			e.preventDefault();
			copySelection();
		} else if (mod && e.key === "v") {
			e.preventDefault();
			pasteClipboard();
		} else if (mod && e.key === "d") {
			e.preventDefault();
			duplicateSelection();
		} else if (e.key === "Delete" && selectedIds.length > 0) {
			vscode.postMessage({ type: "deleteObjects", objectIds: selectedIds });
			selectObjects([]);
		} else if (e.key === "Escape") {
			selectObjects([]);
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

// ---------- Copy / Paste / Duplicate ----------
function copySelection() {
	if (selectedIds.length === 0 || !scene) return;
	clipboard = [];
	for (const id of selectedIds) {
		const obj = findObject(scene, id);
		if (obj) clipboard.push(structuredClone(obj) as GameObject);
	}
	updateToolbarInfo(`Copied ${clipboard.length} object(s)`);
	setTimeout(() => updateToolbarInfo(""), 1500);
}

function pasteClipboard() {
	if (clipboard.length === 0) return;
	// هر پیست با آفست بیشتر
	const offsetX = 20;
	const offsetY = 20;
	for (const obj of clipboard) {
		obj.transform.x += offsetX;
		obj.transform.y += offsetY;
	}
	// درخواست افزودن از extension
	for (const obj of clipboard) {
		// پیام updateObject برای افزودن آبجکت جدید (با id جدید)
		const clone = structuredClone(obj) as GameObject;
		clone.id = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
		clone.name = `${obj.name}_copy`;
		vscode.postMessage({ type: "updateObject", object: clone });
	}
	updateToolbarInfo(`Pasted ${clipboard.length} object(s)`);
	setTimeout(() => updateToolbarInfo(""), 1500);
}

function duplicateSelection() {
	if (selectedIds.length === 0) return;
	vscode.postMessage({ type: "duplicateObjects", objectIds: selectedIds, offsetX: 20, offsetY: 20 });
	updateToolbarInfo(`Duplicated ${selectedIds.length} object(s)`);
	setTimeout(() => updateToolbarInfo(""), 1500);
}

// ---------- Context Menu ----------
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
		<div class="context-menu-separator"></div>
		<div class="context-menu-item" data-action="copy">📋 Copy (Ctrl+C)</div>
		<div class="context-menu-item" data-action="paste">📥 Paste (Ctrl+V)</div>
		<div class="context-menu-item" data-action="duplicate">📑 Duplicate (Ctrl+D)</div>
		<div class="context-menu-separator"></div>
		<div class="context-menu-item" data-action="delete">🗑️ Delete (Del)</div>
	`;
	menu.style.display = "none";
	document.body.appendChild(menu);

	let contextWorldX = 0;
	let contextWorldY = 0;

	app.canvas.addEventListener("contextmenu", (e) => {
		e.preventDefault();
		if (!viewport) return;

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
			case "copy":
				copySelection();
				break;
			case "paste":
				pasteClipboard();
				break;
			case "duplicate":
				duplicateSelection();
				break;
			case "delete":
				if (selectedIds.length > 0) {
					vscode.postMessage({ type: "deleteObjects", objectIds: selectedIds });
					selectObjects([]);
				}
				break;
		}
	});
}

// ---------- Rulers ----------
function setupRulers() {
	rulerH = document.createElement("canvas");
	rulerH.id = "ruler-h";
	rulerH.style.position = "fixed";
	rulerH.style.top = "0";
	rulerH.style.left = "0";
	rulerH.style.width = "100%";
	rulerH.style.height = "20px";
	rulerH.style.background = "var(--vscode-editorWidget-background)";
	rulerH.style.borderBottom = "1px solid var(--vscode-editorWidget-border)";
	rulerH.style.zIndex = "50";
	rulerH.style.pointerEvents = "none";
	document.body.appendChild(rulerH);

	rulerV = document.createElement("canvas");
	rulerV.id = "ruler-v";
	rulerV.style.position = "fixed";
	rulerV.style.top = "0";
	rulerV.style.left = "0";
	rulerV.style.width = "20px";
	rulerV.style.height = "100%";
	rulerV.style.background = "var(--vscode-editorWidget-background)";
	rulerV.style.borderRight = "1px solid var(--vscode-editorWidget-border)";
	rulerV.style.zIndex = "50";
	rulerV.style.pointerEvents = "none";
	document.body.appendChild(rulerV);

	rulerInfo = document.createElement("div");
	rulerInfo.id = "ruler-info";
	rulerInfo.style.position = "fixed";
	rulerInfo.style.bottom = "6px";
	rulerInfo.style.right = "6px";
	rulerInfo.style.padding = "2px 8px";
	rulerInfo.style.background = "var(--vscode-editorWidget-background)";
	rulerInfo.style.border = "1px solid var(--vscode-editorWidget-border)";
	rulerInfo.style.borderRadius = "3px";
	rulerInfo.style.fontSize = "11px";
	rulerInfo.style.fontFamily = "monospace";
	rulerInfo.style.color = "var(--vscode-descriptionForeground)";
	rulerInfo.style.zIndex = "50";
	rulerInfo.style.pointerEvents = "none";
	rulerInfo.textContent = "0, 0";
	document.body.appendChild(rulerInfo);

	drawRulers();
	window.addEventListener("resize", drawRulers);
	// هر ۱۰۰ms رفرش کن (وقتی pan/zoom تغییر می‌کند)
	setInterval(drawRulers, 100);
}

function drawRulers() {
	if (!rulerH || !rulerV || !viewport) return;

	const dpr = window.devicePixelRatio || 1;

	// افقی
	const hw = window.innerWidth;
	const hh = 20;
	rulerH.width = hw * dpr;
	rulerH.height = hh * dpr;
	const ctxH = rulerH.getContext("2d")!;
	ctxH.scale(dpr, dpr);
	ctxH.clearRect(0, 0, hw, hh);

	// عمودی
	const vw = 20;
	const vh = window.innerHeight;
	rulerV.width = vw * dpr;
	rulerV.height = vh * dpr;
	const ctxV = rulerV.getContext("2d")!;
	ctxV.scale(dpr, dpr);
	ctxV.clearRect(0, 0, vw, vh);

	const textColor = getComputedStyle(document.body).color || "#888";
	const scale = viewport.scale.x;

	// محاسبه فاصله برچسب بر اساس scale
	let step = 100;
	if (scene?.gridSize) step = scene.gridSize;
	while (step * scale < 40) step *= 2;
	while (step * scale > 200) step /= 2;

	// خطوط افقی
	const worldLeft = viewport.toWorld(20, 0).x;
	const worldRight = viewport.toWorld(hw, 0).x;
	const startX = Math.floor(worldLeft / step) * step;

	ctxH.fillStyle = textColor;
	ctxH.font = "9px monospace";
	ctxH.strokeStyle = textColor;
	ctxH.lineWidth = 1;

	for (let wx = startX; wx <= worldRight; wx += step) {
		const sx = viewport.toScreen(wx, 0).x;
		if (sx < 20 || sx > hw) continue;
		ctxH.beginPath();
		ctxH.moveTo(sx, hh - 6);
		ctxH.lineTo(sx, hh);
		ctxH.stroke();
		ctxH.fillText(String(wx), sx + 2, 10);
	}

	// خطوط عمودی
	const worldTop = viewport.toWorld(0, 20).y;
	const worldBottom = viewport.toWorld(0, vh).y;
	const startY = Math.floor(worldTop / step) * step;

	ctxV.fillStyle = textColor;
	ctxV.font = "9px monospace";
	ctxV.strokeStyle = textColor;

	for (let wy = startY; wy <= worldBottom; wy += step) {
		const sy = viewport.toScreen(0, wy).y;
		if (sy < 20 || sy > vh) continue;
		ctxV.beginPath();
		ctxV.moveTo(vw - 6, sy);
		ctxV.lineTo(vw, sy);
		ctxV.stroke();
		// متن را ۹۰ درجه بچرخان
		ctxV.save();
		ctxV.translate(10, sy + 2);
		ctxV.rotate(-Math.PI / 2);
		ctxV.fillText(String(wy), 0, 0);
		ctxV.restore();
	}
}

// ---------- Mouse Tracker ----------
function setupMouseTracker() {
	app.canvas.addEventListener("mousemove", (e) => {
		if (!viewport) return;
		const rect = app.canvas.getBoundingClientRect();
		const world = viewport.toWorld(e.clientX - rect.left, e.clientY - rect.top);
		mouseWorldX = Math.round(world.x);
		mouseWorldY = Math.round(world.y);
		if (rulerInfo) {
			rulerInfo.textContent = `${mouseWorldX}, ${mouseWorldY}`;
		}
	});

	app.canvas.addEventListener("mouseleave", () => {
		if (rulerInfo) rulerInfo.textContent = "";
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

	let rendered = false;

	if (obj.type === "sprite" && obj.texture) {
		const cached = textureCache.get(obj.texture);
		if (cached) {
			const sprite = new Sprite(cached);
			sprite.width = t.width;
			sprite.height = t.height;
			container.addChild(sprite);
			rendered = true;
		}
	}

	if (!rendered) {
		if (obj.type === "shape") {
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
			const color = obj.color ? parseInt(obj.color.replace("#", "0x")) : 0x4a9eff;
			g.rect(0, 0, t.width, t.height);
			g.fill({ color, alpha: 1 });
			g.stroke({ width: 1, color: 0x000000, alpha: 0.4 });
			container.addChild(g);
		}
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

// ---------- Drag ----------
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

// ---------- Selection Outlines + Resize + Rotate ----------
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
			drawRotateHandle(obj, t);
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

function drawRotateHandle(obj: GameObject, t: GameObject["transform"]) {
	// نقطه چرخش بالای کادر انتخاب
	const top = -t.height * t.originY;
	const centerY = top - 25;

	const handle = new Graphics();
	handle.circle(0, 0, 6);
	handle.fill({ color: 0x4aff9b });
	handle.stroke({ width: 2, color: 0x1a1a1a, alpha: 0.7 });

	// خط اتصال
	const line = new Graphics();
	line.moveTo(0, top);
	line.lineTo(0, centerY);
	line.stroke({ width: 1, color: 0x4aff9b, alpha: 0.5 });

	// کانتینر برای اعمال rotation و scale
	const rotateContainer = new Container();
	rotateContainer.x = t.x;
	rotateContainer.y = t.y;
	rotateContainer.rotation = (t.rotation * Math.PI) / 180;
	rotateContainer.scale.set(t.scaleX, t.scaleY);

	const lineContainer = new Container();
	lineContainer.addChild(line);
	lineContainer.addChild(handle);
	lineContainer.y = centerY;
	lineContainer.eventMode = "static";
	lineContainer.cursor = "grab";

	lineContainer.on("pointerdown", (e) => {
		e.stopPropagation();
		startRotate(e, obj);
	});

	rotateContainer.addChild(lineContainer);
	selectionLayer.addChild(rotateContainer);
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

// ---------- Rotate ----------
function startRotate(e: any, obj: GameObject) {
	isRotating = true;

	const t = obj.transform;
	const centerWorld = { x: t.x, y: t.y };

	const onMove = (moveEvent: any) => {
		if (!isRotating || !viewport) return;

		// موقعیت ماوس در world
		const world = viewport.toWorld(moveEvent.global.x, moveEvent.global.y);
		// زاویه نسبت به مرکز
		const dx = world.x - centerWorld.x;
		const dy = world.y - centerWorld.y;
		let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
		// چون نقطه چرخش بالای آبجکت است، ۹۰ درجه اضافه می‌کنیم
		angleDeg += 90;

		// Shift → snap به ۱۵ درجه
		if (moveEvent.shiftKey) {
			angleDeg = Math.round(angleDeg / 15) * 15;
		}

		obj.transform.rotation = angleDeg;

		rerenderObject(obj);
		drawSelectionOutlines();
	};

	const onUp = () => {
		isRotating = false;
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
		if (!isDraggingObject && !isResizing && !isRotating) {
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

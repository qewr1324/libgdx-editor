// src/webview/viewport/ui/guides.ts
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { app, gizmoLayer, scene, viewport } from "../state.js";
import type { Guide, GuideAxis } from "../../../types/guides.js";
import { DEFAULT_GUIDE_COLOR } from "../../../types/guides.js";
import { vscode } from "../types.js";

// ============================================================
// State
// ============================================================

interface GuideDragState {
	guideId: string;
	axis: GuideAxis;
	startScreenPos: number;
	startWorldPos: number;
}

let guideLayer: Container | null = null;
let dragState: GuideDragState | null = null;
let hoveredGuideId: string | null = null;
let selectedGuideId: string | null = null;

// ============================================================
// Constants
// ============================================================

const GUIDE_WIDTH_NORMAL = 1.5;
const GUIDE_WIDTH_HOVER = 2.5;
const GUIDE_WIDTH_SELECTED = 3;
const GUIDE_HIT_WIDTH = 8; // پیکسل راحت برای کلیک
const DEFAULT_COLOR = 0x00b8d4;

// ============================================================
// Setup
// ============================================================

export function setupGuides(): void {
	if (!viewport) return;

	guideLayer = new Container();
	guideLayer.label = "guides";
	guideLayer.eventMode = "static";

	// بین grid و content — چون باید پشت آبجکت‌ها باشه
	viewport.addChildAt(guideLayer, 1);

	// global pointer events برای drag
	window.addEventListener("pointermove", handlePointerMove);
	window.addEventListener("pointerup", handlePointerUp);
	window.addEventListener("pointercancel", handlePointerUp);

	// context menu برای حذف
	app.canvas.addEventListener("contextmenu", handleContextMenu);
}

// ============================================================
// Render
// ============================================================

export function renderGuides(): void {
	if (!guideLayer || !scene || !viewport) return;

	guideLayer.removeChildren();

	// اگه guides مخفی هستن، کاری نکن
	if (scene.showGuides === false) return;

	const guides = scene.guides ?? [];
	if (guides.length === 0) return;

	const worldW = scene.worldSize.width;
	const worldH = scene.worldSize.height;

	for (const guide of guides) {
		const color = parseColor(guide.color);
		const isHovered = hoveredGuideId === guide.id;
		const isSelected = selectedGuideId === guide.id;

		let width = GUIDE_WIDTH_NORMAL;
		let alpha = 0.85;
		if (isSelected) {
			width = GUIDE_WIDTH_SELECTED;
			alpha = 1;
		} else if (isHovered) {
			width = GUIDE_WIDTH_HOVER;
			alpha = 1;
		}

		const g = new Graphics();

		if (guide.axis === "vertical") {
			g.moveTo(guide.position, 0);
			g.lineTo(guide.position, worldH);
		} else {
			g.moveTo(0, guide.position);
			g.lineTo(worldW, guide.position);
		}

		g.stroke({ width, color, alpha });

		// hit area — نامرئی ولی کلیک‌پذیر
		const hit = new Graphics();
		if (guide.axis === "vertical") {
			hit.rect(guide.position - GUIDE_HIT_WIDTH / 2, 0, GUIDE_HIT_WIDTH, worldH);
		} else {
			hit.rect(0, guide.position - GUIDE_HIT_WIDTH / 2, worldW, GUIDE_HIT_WIDTH);
		}
		hit.fill({ color: 0x000000, alpha: 0.001 });
		hit.eventMode = "static";

		if (guide.locked) {
			hit.cursor = "not-allowed";
		} else {
			hit.cursor = guide.axis === "vertical" ? "ew-resize" : "ns-resize";
		}

		hit.on("pointerover", () => {
			hoveredGuideId = guide.id;
			renderGuides();
		});
		hit.on("pointerout", () => {
			if (hoveredGuideId === guide.id) {
				hoveredGuideId = null;
				renderGuides();
			}
		});
		hit.on("pointerdown", (e) => {
			if (e.button !== 0) return;
			e.stopPropagation();
			selectedGuideId = guide.id;

			if (guide.locked) {
				renderGuides();
				return;
			}

			if (!viewport) return;
			const rect = app.canvas.getBoundingClientRect();
			const world = viewport.toWorld(e.clientX - rect.left, e.clientY - rect.top);
			const startWorldPos = guide.axis === "vertical" ? world.x : world.y;

			dragState = {
				guideId: guide.id,
				axis: guide.axis,
				startScreenPos: guide.axis === "vertical" ? e.clientX : e.clientY,
				startWorldPos,
			};

			renderGuides();
		});

		guideLayer.addChild(g);
		guideLayer.addChild(hit);

		// label کوچیک برای guide انتخاب‌شده
		if (isSelected || isHovered) {
			const label = createGuideLabel(guide, color);
			guideLayer.addChild(label);
		}
	}
}

// ============================================================
// Label
// ============================================================

function createGuideLabel(guide: Guide, color: number): Container {
	const container = new Container();
	container.eventMode = "none";

	const text = `${Math.round(guide.position)}${guide.locked ? " 🔒" : ""}`;
	const style = new TextStyle({
		fontFamily: "monospace",
		fontSize: 10,
		fill: color,
		fontWeight: "bold",
	});

	const textObj = new Text({ text, style });
	textObj.eventMode = "none";

	const pad = 4;
	const bg = new Graphics();
	bg.roundRect(-pad, -pad, textObj.width + pad * 2, textObj.height + pad * 2, 2);
	bg.fill({ color: 0x000000, alpha: 0.75 });
	bg.stroke({ width: 1, color, alpha: 0.5 });
	bg.eventMode = "none";

	container.addChild(bg);
	container.addChild(textObj);

	// موقعیت label
	if (guide.axis === "vertical") {
		container.x = guide.position + 8;
		container.y = 8;
	} else {
		container.x = 8;
		container.y = guide.position + 8;
	}

	return container;
}

// ============================================================
// Drag Handlers
// ============================================================

function handlePointerMove(e: PointerEvent): void {
	if (!dragState || !viewport) return;

	const rect = app.canvas.getBoundingClientRect();
	const world = viewport.toWorld(e.clientX - rect.left, e.clientY - rect.top);

	const newPos = dragState.axis === "vertical" ? world.x : world.y;

	// snap به grid اگه فعاله
	let finalPos = newPos;
	if (scene?.snapToGrid) {
		const g = scene.gridSize || 32;
		finalPos = Math.round(newPos / g) * g;
	}

	// آپدیت local برای رندر فوری
	if (scene?.guides) {
		const guide = scene.guides.find((g) => g.id === dragState!.guideId);
		if (guide) {
			guide.position = Math.round(finalPos);
			renderGuides();
		}
	}
}

function handlePointerUp(): void {
	if (!dragState) return;

	// پیام به extension
	if (scene?.guides) {
		const guide = scene.guides.find((g) => g.id === dragState!.guideId);
		if (guide) {
			vscode.postMessage({
				type: "moveGuide",
				guideId: guide.id,
				position: guide.position,
			});
		}
	}

	dragState = null;
	renderGuides();
}

// ============================================================
// Context Menu (حذف guide)
// ============================================================

function handleContextMenu(e: MouseEvent): void {
	if (!viewport || !scene) return;
	const guides = scene.guides ?? [];
	if (guides.length === 0) return;

	const rect = app.canvas.getBoundingClientRect();
	const world = viewport.toWorld(e.clientX - rect.left, e.clientY - rect.top);
	const tolerance = 6 / viewport.scale.x; // ۶ پیکسل در screen space

	// پیدا کردن guide نزدیک به کلیک
	const clicked = guides.find((g) => {
		if (g.axis === "vertical") return Math.abs(world.x - g.position) < tolerance;
		return Math.abs(world.y - g.position) < tolerance;
	});

	if (clicked) {
		e.preventDefault();
		e.stopPropagation();

		if (clicked.locked) {
			// اگه قفله، پیشنهاد unlock
			if (window.confirm(`Unlock this guide?`)) {
				vscode.postMessage({ type: "toggleGuideLock", guideId: clicked.id });
			}
			return;
		}

		// حذف
		vscode.postMessage({ type: "removeGuide", guideId: clicked.id });
		selectedGuideId = null;
		hoveredGuideId = null;
		renderGuides();
	}
}

// ============================================================
// Clear / Visibility
// ============================================================

export function clearAllGuides(): void {
	if (!scene?.guides || scene.guides.length === 0) return;
	vscode.postMessage({ type: "clearGuides" });
}

export function toggleGuidesVisibility(): void {
	vscode.postMessage({ type: "toggleGuidesVisibility" });
}

// ============================================================
// Helpers
// ============================================================

function parseColor(hex: string | undefined): number {
	if (!hex) return DEFAULT_COLOR;
	const clean = hex.replace("#", "");
	const num = Number.parseInt(clean, 16);
	return Number.isNaN(num) ? DEFAULT_COLOR : num;
}

export function getSelectedGuideId(): string | null {
	return selectedGuideId;
}

export function clearGuideSelection(): void {
	selectedGuideId = null;
	renderGuides();
}

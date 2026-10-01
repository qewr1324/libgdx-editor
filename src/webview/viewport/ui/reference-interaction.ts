// src/webview/viewport/ui/reference-interaction.ts
import { app, scene, viewport } from "../state.js";
import { getReferenceContainer } from "../render/reference.js";
import { vscode } from "../types.js";

// ============================================================
// State
// ============================================================

interface RefDragState {
	startWorldX: number;
	startWorldY: number;
	startX: number;
	startY: number;
	mode: "move" | "resize";
	handle: string;
	startWidth: number;
	startHeight: number;
}

let dragState: RefDragState | null = null;

const RESIZE_HANDLE_SIZE = 12; // پیکسل توی screen space

// ============================================================
// Setup
// ============================================================

export function setupReferenceInteraction(): void {
	window.addEventListener("pointermove", handlePointerMove);
	window.addEventListener("pointerup", handlePointerUp);
	window.addEventListener("pointercancel", handlePointerUp);
}

// ============================================================
// Start drag
// ============================================================

/**
 * وقتی کاربر روی reference image کلیک می‌کنه، این رو صدا بزن.
 * (از viewport/messages.ts یا هرجای دیگه)
 */
export function beginReferenceDrag(e: PointerEvent): void {
	if (!scene?.referenceImage || !viewport) return;
	if (scene.referenceImage.locked) return;

	const ref = scene.referenceImage;
	const rect = app.canvas.getBoundingClientRect();
	const world = viewport.toWorld(e.clientX - rect.left, e.clientY - rect.top);

	dragState = {
		startWorldX: world.x,
		startWorldY: world.y,
		startX: ref.transform.x,
		startY: ref.transform.y,
		mode: "move",
		handle: "center",
		startWidth: ref.transform.width,
		startHeight: ref.transform.height,
	};

	e.stopPropagation();
}

// ============================================================
// Drag move
// ============================================================

function handlePointerMove(e: PointerEvent): void {
	if (!dragState || !viewport || !scene?.referenceImage) return;

	const ref = scene.referenceImage;
	const rect = app.canvas.getBoundingClientRect();
	const world = viewport.toWorld(e.clientX - rect.left, e.clientY - rect.top);

	const dx = world.x - dragState.startWorldX;
	const dy = world.y - dragState.startWorldY;

	let newX = dragState.startX;
	let newY = dragState.startY;
	let newW = dragState.startWidth;
	let newH = dragState.startHeight;

	// Move فقط (resize handle هارو ساده نگه داشتیم)
	if (dragState.mode === "move") {
		newX = dragState.startX + dx;
		newY = dragState.startY + dy;

		// snap به grid
		if (scene.snapToGrid) {
			const g = scene.gridSize || 32;
			newX = Math.round(newX / g) * g;
			newY = Math.round(newY / g) * g;
		}

		// آپدیت local
		ref.transform.x = Math.round(newX);
		ref.transform.y = Math.round(newY);
	}

	// رندر مجدد
	const container = getReferenceContainer();
	if (container) {
		container.x = ref.transform.x;
		container.y = ref.transform.y;
	}
}

// ============================================================
// Drag end
// ============================================================

function handlePointerUp(): void {
	if (!dragState || !scene?.referenceImage) return;

	const ref = scene.referenceImage;

	// پیام به extension
	vscode.postMessage({
		type: "updateReferenceTransform",
		transform: {
			x: ref.transform.x,
			y: ref.transform.y,
			width: ref.transform.width,
			height: ref.transform.height,
		},
	});

	dragState = null;
}

// ============================================================
// Attach to reference container
// ============================================================

/**
 * وقتی reference container ساخته شد، بهش pointerdown وصل کن.
 * از render/reference.ts صدا زده می‌شه.
 */
export function attachReferencePointerEvents(container: import("pixi.js").Container): void {
	container.on("pointerdown", (e) => {
		if (!scene?.referenceImage) return;
		if (scene.referenceImage.locked) return;

		// فقط با دکمه‌ی چپ
		if (e.button !== 0) return;

		beginReferenceDrag(e as unknown as PointerEvent);
	});
}

// src/webview/viewport/render/reference.ts (نسخه‌ی نهایی)
import { Container, Graphics, Rectangle, Sprite } from "pixi.js";
import { viewport, textureCache } from "../state.js";
import type { Scene, ReferenceImage } from "../../../types/scene.js";
import { attachReferencePointerEvents } from "../ui/reference-interaction.js";

// ============================================================
// State
// ============================================================

let referenceLayer: Container | null = null;
let referenceContainer: Container | null = null;
let currentReference: ReferenceImage | null = null;

// ============================================================
// Setup
// ============================================================

export function setupReferenceLayer(): void {
	if (!viewport) return;

	referenceLayer = new Container();
	referenceLayer.label = "reference-image";
	referenceLayer.eventMode = "static";

	// بالا‌تر از grid (index 0)، پایین‌تر از content (index 2)
	if (viewport.children.length > 0) {
		viewport.addChildAt(referenceLayer, 1);
	} else {
		viewport.addChild(referenceLayer);
	}
}

// ============================================================
// Render
// ============================================================

export function renderReference(scene: Scene | null): void {
	if (!referenceLayer) return;

	if (referenceContainer) {
		referenceLayer.removeChild(referenceContainer);
		referenceContainer.destroy({ children: true });
		referenceContainer = null;
	}

	currentReference = scene?.referenceImage ?? null;

	if (!scene || !scene.referenceImage) return;
	if (scene.referenceImage.hidden) return;

	const ref = scene.referenceImage;
	const cached = textureCache.get(ref.texture);

	referenceContainer = new Container();
	referenceContainer.label = "reference";
	referenceContainer.eventMode = "static";

	const t = ref.transform;

	if (cached) {
		const sprite = new Sprite(cached);
		sprite.width = t.width;
		sprite.height = t.height;
		sprite.eventMode = "none";
		sprite.alpha = ref.opacity ?? 0.5;

		if (ref.tint && ref.tint !== "#ffffff") {
			const color = Number.parseInt(ref.tint.replace("#", ""), 16);
			if (!Number.isNaN(color)) sprite.tint = color;
		}

		referenceContainer.addChild(sprite);
	} else {
		// placeholder در حال لود
		const placeholder = new Graphics();
		placeholder.rect(0, 0, t.width, t.height);
		placeholder.fill({ color: 0x333333, alpha: 0.2 });
		placeholder.stroke({ width: 2, color: 0x666666, alpha: 0.6 });
		placeholder.eventMode = "none";
		referenceContainer.addChild(placeholder);
	}

	referenceContainer.pivot.set(t.width * t.originX, t.height * t.originY);
	referenceContainer.x = t.x;
	referenceContainer.y = t.y;
	referenceContainer.rotation = (t.rotation * Math.PI) / 180;
	referenceContainer.scale.set(t.scaleX, t.scaleY);

	referenceContainer.hitArea = new Rectangle(0, 0, t.width, t.height);

	if (!ref.locked) {
		referenceContainer.cursor = "move";
	} else {
		referenceContainer.cursor = "not-allowed";
	}

	// 🆕 attach pointer events
	attachReferencePointerEvents(referenceContainer);

	referenceLayer.addChild(referenceContainer);
}

// ============================================================
// Helpers
// ============================================================

export function hasVisibleReference(): boolean {
	return referenceContainer !== null;
}

export function getReferenceContainer(): Container | null {
	return referenceContainer;
}

export function getCurrentReference(): ReferenceImage | null {
	return currentReference;
}

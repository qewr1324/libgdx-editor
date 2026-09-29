// src/webview/inspector/events/component-events.ts
import type { ComponentType } from "../../../types/components.js";
import { currentObject, componentMenuOpen, setComponentMenuOpen } from "../state.js";
import { app, vscode } from "../vscode-api.js";
import { requestAtlasRegions, reloadAtlasRegions } from "../atlas-cache.js";

let outsideClickInstalled = false;

function installOutsideClickListenerOnce(): void {
	if (outsideClickInstalled) return;
	outsideClickInstalled = true;

	document.addEventListener("click", () => {
		if (componentMenuOpen) {
			setComponentMenuOpen(false);
			app.querySelector("[data-component-add-menu]")?.classList.remove("open");
		}
	});
}

// ============================================================
// Add menu
// ============================================================

export function attachComponentAddMenu(): void {
	installOutsideClickListenerOnce();

	const toggle = app.querySelector<HTMLButtonElement>("[data-component-add-toggle]");
	const menu = app.querySelector<HTMLDivElement>("[data-component-add-menu]");

	toggle?.addEventListener("click", (e) => {
		e.stopPropagation();
		const newState = !componentMenuOpen;
		setComponentMenuOpen(newState);
		if (menu) {
			menu.classList.toggle("open", newState);
		}
	});

	const items = app.querySelectorAll<HTMLDivElement>("[data-component-add-type]");
	for (const item of items) {
		item.addEventListener("click", (e) => {
			e.stopPropagation();
			if (!currentObject) return;
			const type = item.dataset.componentAddType as ComponentType;
			setComponentMenuOpen(false);
			vscode.postMessage({
				type: "addComponent",
				objectId: currentObject.id,
				componentType: type,
			});
		});
	}
}

// ============================================================
// Cards (fields + remove + reload + atlas trigger)
// ============================================================

export function attachComponentCards(): void {
	const removeButtons = app.querySelectorAll<HTMLButtonElement>("[data-component-remove]");
	for (const btn of removeButtons) {
		btn.addEventListener("click", (e) => {
			e.stopPropagation();
			if (!currentObject) return;
			const componentId = btn.dataset.componentRemove!;
			vscode.postMessage({
				type: "removeComponent",
				objectId: currentObject.id,
				componentId,
			});
		});
	}

	const inputs = app.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("[data-component-field]");
	for (const input of inputs) {
		const componentId = input.dataset.componentId!;
		const fieldName = input.dataset.componentField!;

		if (fieldName === "frames" && input instanceof HTMLTextAreaElement) {
			input.addEventListener("change", () => {
				const frames = input.value
					.split(",")
					.map((s) => s.trim())
					.filter((s) => s.length > 0);
				sendComponentUpdate(componentId, { frames });
			});
			continue;
		}

		if (input instanceof HTMLInputElement && input.type === "checkbox") {
			input.addEventListener("change", () => {
				sendComponentUpdate(componentId, { [fieldName]: input.checked });
			});
		} else if (input instanceof HTMLInputElement && input.type === "number") {
			input.addEventListener("change", () => {
				const value = Number.parseFloat(input.value);
				if (!Number.isNaN(value)) {
					sendComponentUpdate(componentId, { [fieldName]: value });
				}
			});
			input.addEventListener("keydown", (e) => {
				if (e.key === "Enter") input.blur();
			});
		} else if (input instanceof HTMLInputElement && input.type === "color") {
			input.addEventListener("input", () => {
				const textInput = input.parentElement?.querySelector<HTMLInputElement>('input[type="text"]');
				if (textInput && document.activeElement !== textInput) {
					textInput.value = input.value;
				}
				sendComponentUpdate(componentId, { [fieldName]: input.value });
			});
		} else if (input instanceof HTMLInputElement) {
			input.addEventListener("change", () => {
				sendComponentUpdate(componentId, { [fieldName]: input.value });
			});
			input.addEventListener("keydown", (e) => {
				if (e.key === "Enter") input.blur();
			});
		} else if (input instanceof HTMLSelectElement) {
			input.addEventListener("change", () => {
				sendComponentUpdate(componentId, { [fieldName]: input.value });
			});
		}
	}

	const reloadButtons = app.querySelectorAll<HTMLButtonElement>("[data-component-reload]");
	for (const btn of reloadButtons) {
		btn.addEventListener("click", (e) => {
			e.stopPropagation();
			const texPath = btn.dataset.componentTexture;
			if (texPath) {
				reloadAtlasRegions(texPath);
			}
		});
	}

	const atlasTriggers = app.querySelectorAll<HTMLInputElement>("[data-atlas-trigger]");
	for (const input of atlasTriggers) {
		input.addEventListener("blur", () => {
			const texPath = input.value.trim();
			if (texPath) {
				requestAtlasRegions(texPath);
			}
		});
	}
}

// ============================================================
// Helper
// ============================================================

function sendComponentUpdate(componentId: string, updates: Record<string, unknown>): void {
	if (!currentObject) return;
	vscode.postMessage({
		type: "updateComponent",
		objectId: currentObject.id,
		componentId,
		updates,
	});
}

// src/webview/inspector/events/drag-handles.ts
import { currentObject } from "../state.js";
import { app, vscode } from "../vscode-api.js";

export function attachDragHandles(mode: "object" | "scene"): void {
	const dragHandles = app.querySelectorAll<HTMLElement>("[data-drag-field]");
	for (const handle of dragHandles) {
		const fieldKey = handle.dataset.dragField!;
		const sensitivity = parseFloat(handle.dataset.dragSensitivity ?? "1");

		let isDragging = false;
		let startX = 0;
		let startValue = 0;

		handle.addEventListener("pointerdown", (e) => {
			e.preventDefault();
			e.stopPropagation();
			isDragging = true;
			startX = e.clientX;

			const input = handle.parentElement?.querySelector<HTMLInputElement>("input");
			startValue = parseFloat(input?.value ?? "0");
			if (Number.isNaN(startValue)) startValue = 0;

			handle.setPointerCapture(e.pointerId);
			document.body.style.cursor = "ew-resize";
		});

		handle.addEventListener("pointermove", (e) => {
			if (!isDragging) return;
			const dx = e.clientX - startX;
			const deltaValue = dx * sensitivity * 0.5;
			const newValue = startValue + deltaValue;

			const input = handle.parentElement?.querySelector<HTMLInputElement>("input");
			if (input) {
				const step = parseFloat(input.step || "1");
				const rounded = step < 1 ? Math.round(newValue * 100) / 100 : Math.round(newValue);
				input.value = String(rounded);
			}
		});

		const finish = (e: PointerEvent) => {
			if (!isDragging) return;
			isDragging = false;
			try {
				handle.releasePointerCapture(e.pointerId);
			} catch {
				// ignore
			}
			document.body.style.cursor = "";

			const input = handle.parentElement?.querySelector<HTMLInputElement>("input");
			if (input) {
				const value = parseFloat(input.value);
				if (!Number.isNaN(value)) {
					if (mode === "object" && currentObject) {
						if (fieldKey === "zIndex") {
							vscode.postMessage({ type: "setObjectZIndex", objectId: currentObject.id, zIndex: Math.round(value) });
						} else if (fieldKey.startsWith("component:")) {
							const parts = fieldKey.split(":");
							if (parts.length === 3) {
								const compId = parts[1];
								const compField = parts[2];
								vscode.postMessage({
									type: "updateComponent",
									objectId: currentObject.id,
									componentId: compId,
									updates: { [compField]: value },
								});
							}
						} else {
							vscode.postMessage({
								type: "updateObjectField",
								objectId: currentObject.id,
								field: fieldKey,
								value,
							});
						}
					} else if (mode === "scene") {
						vscode.postMessage({ type: "updateSceneField", field: fieldKey, value, historyLabel: `scene: ${fieldKey}` });
					}
				}
			}
		};

		handle.addEventListener("pointerup", finish);
		handle.addEventListener("pointercancel", finish);
	}
}

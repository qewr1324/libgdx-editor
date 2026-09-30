// src/webview/components/render.ts
import type { GameObject } from "../../types/scene.js";
import type { Component } from "../../types/components.js";
import { COMPONENT_LABELS, COMPONENT_ICONS } from "../../types/components.js";
import { app, vscode } from "./vscode-api.js";
import { currentObject, currentObjectId, setCurrentObjectId, multiSelection, getAtlasRegions, collapsedSections } from "./state.js";
import { ICONS } from "./icons.js";
import { escapeAttr, escapeHtml } from "./utils.js";
import { applyEffectiveTheme } from "./theme.js";

export function render(force = false): void {
	applyEffectiveTheme();

	if (multiSelection) {
		app.innerHTML = `
			<div class="components-empty">
				<div class="components-empty-icon">▣▣</div>
				<div class="components-empty-title">${multiSelection.count} objects selected</div>
				<div class="components-empty-hint">Select a single object to edit its components</div>
			</div>
		`;
		setCurrentObjectId(null);
		return;
	}

	if (!currentObject) {
		app.innerHTML = `
			<div class="components-empty">
				<div class="components-empty-icon">🧩</div>
				<div class="components-empty-title">No object selected</div>
				<div class="components-empty-hint">Click on an object in the viewport<br/>to see and edit its components</div>
			</div>
		`;
		setCurrentObjectId(null);
		return;
	}

	if (!force && currentObjectId === currentObject.id && app.querySelector(".components-panel")) {
		updateComponentFieldValuesForAll(currentObject);
		return;
	}

	setCurrentObjectId(currentObject.id);
	app.innerHTML = buildPanelHtml(currentObject);
	attachListeners();
}

// ============================================================
// Build
// ============================================================

function buildPanelHtml(obj: GameObject): string {
	return `
		<div class="components-panel">
			${buildComponentsSection(obj)}
		</div>
	`;
}

function buildComponentsSection(obj: { components?: Component[] }): string {
	const components = obj.components ?? [];
	const collapsed = collapsedSections.has("components");

	const componentsHtml = components.length === 0 ? `<div class="components-empty-inner">No components attached. Use "Add Object" in the toolbar.</div>` : components.map((c) => buildCard(c)).join("");

	return `
		<div class="components-section">
			<div class="components-section-header" data-section-toggle="components">
				<span class="components-section-chevron">${collapsed ? ICONS.chevronRight : ICONS.chevron}</span>
				<span class="components-section-label">Components</span>
			</div>
			<div class="components-section-body" style="${collapsed ? "display:none;" : ""}">
				${componentsHtml}
			</div>
		</div>
	`;
}

function buildCard(comp: Component): string {
	const icon = COMPONENT_ICONS[comp.type];
	const label = COMPONENT_LABELS[comp.type];

	let bodyHtml = "";
	switch (comp.type) {
		case "sprite":
			bodyHtml = buildSpriteBody(comp);
			break;
		case "atlas":
			bodyHtml = buildAtlasBody(comp);
			break;
		case "animation":
			bodyHtml = buildAnimationBody(comp);
			break;
		case "shape":
			bodyHtml = buildShapeBody(comp);
			break;
		case "text":
			bodyHtml = buildTextBody(comp);
			break;
	}

	return `
		<div class="components-card" data-card="${comp.id}">
			<div class="components-card-header">
				<span class="components-card-icon">${icon}</span>
				<span class="components-card-label">${escapeHtml(label)}</span>
				<button class="components-card-remove" data-remove="${comp.id}" title="Remove component">${ICONS.close}</button>
			</div>
			<div class="components-card-body">
				${bodyHtml}
			</div>
		</div>
	`;
}

// ============================================================
// Bodies
// ============================================================

function buildSpriteBody(comp: Extract<Component, { type: "sprite" }>): string {
	return `
		${field("Texture", `<input type="text" data-comp-field="texture" data-comp-id="${comp.id}" value="${escapeAttr(comp.texture)}" placeholder="path/to/texture.png" />`)}
		<div class="components-field wide">
			<label class="components-field-label">Tint</label>
			<div class="components-color-row">
				<input type="color" data-comp-field="tint" data-comp-id="${comp.id}" value="${comp.tint || "#ffffff"}" />
				<input type="text" data-comp-field="tint" data-comp-id="${comp.id}" value="${escapeAttr(comp.tint || "#ffffff")}" />
			</div>
		</div>
		<div class="components-field wide">
			<label class="components-checkbox-row">
				<input type="checkbox" data-comp-field="flipX" data-comp-id="${comp.id}" ${comp.flipX ? "checked" : ""} />
				<span>Flip X</span>
			</label>
		</div>
		<div class="components-field wide">
			<label class="components-checkbox-row">
				<input type="checkbox" data-comp-field="flipY" data-comp-id="${comp.id}" ${comp.flipY ? "checked" : ""} />
				<span>Flip Y</span>
			</label>
		</div>
	`;
}

function buildAtlasBody(comp: Extract<Component, { type: "atlas" }>): string {
	const regions = getAtlasRegions(comp.texture);
	const hasRegions = regions !== null && regions.length > 0;

	const regionOptions = hasRegions ? regions!.map((r) => `<option value="${escapeAttr(r.name)}" ${comp.region === r.name ? "selected" : ""}>${escapeHtml(r.name)}</option>`).join("") : `<option value="${escapeAttr(comp.region)}" selected>${escapeHtml(comp.region || "(no regions loaded)")}</option>`;

	return `
		${field("Texture", `<input type="text" data-comp-field="texture" data-comp-id="${comp.id}" value="${escapeAttr(comp.texture)}" placeholder="path/to/texture.png" data-atlas-trigger />`)}
		${field("Atlas", `<input type="text" data-comp-field="atlasPath" data-comp-id="${comp.id}" value="${escapeAttr(comp.atlasPath)}" placeholder="path/to/texture.atlas" />`)}
		<div class="components-field">
			<label class="components-field-label">Region</label>
			<div class="components-field-input">
				<select data-comp-field="region" data-comp-id="${comp.id}" ${!hasRegions ? "disabled" : ""}>
					${regionOptions}
				</select>
				<button class="components-reload" data-reload="${comp.id}" data-reload-texture="${escapeAttr(comp.texture)}" title="Reload regions">🔄</button>
			</div>
		</div>
		<div class="components-field wide">
			<label class="components-field-label">Tint</label>
			<div class="components-color-row">
				<input type="color" data-comp-field="tint" data-comp-id="${comp.id}" value="${comp.tint || "#ffffff"}" />
				<input type="text" data-comp-field="tint" data-comp-id="${comp.id}" value="${escapeAttr(comp.tint || "#ffffff")}" />
			</div>
		</div>
		${!hasRegions && comp.texture ? `<div class="components-hint">No atlas file found. Will render as simple texture.</div>` : ""}
	`;
}

function buildAnimationBody(comp: Extract<Component, { type: "animation" }>): string {
	return `
		${field("Atlas", `<input type="text" data-comp-field="atlasPath" data-comp-id="${comp.id}" value="${escapeAttr(comp.atlasPath)}" placeholder="path/to/atlas.atlas" data-atlas-trigger />`)}
		${field("Texture", `<input type="text" data-comp-field="texture" data-comp-id="${comp.id}" value="${escapeAttr(comp.texture)}" placeholder="path/to/texture.png" />`)}
		${field("Frames", `<textarea class="components-frames-textarea" data-comp-field="frames" data-comp-id="${comp.id}" rows="3" placeholder="frame1, frame2, frame3">${escapeHtml(comp.frames.join(", "))}</textarea>`)}
		<div class="components-field-row">
			${numberField("FPS", `component:${comp.id}:fps`, comp.fps, { step: 1, min: 1, max: 60 })}
			${field(
				"Play Mode",
				`<select data-comp-field="playMode" data-comp-id="${comp.id}">
					${["NORMAL", "REVERSED", "LOOP", "LOOP_REVERSED", "LOOP_PINGPONG", "LOOP_RANDOM"].map((m) => `<option value="${m}" ${comp.playMode === m ? "selected" : ""}>${m}</option>`).join("")}
				</select>`,
			)}
		</div>
		<div class="components-field wide">
			<label class="components-checkbox-row">
				<input type="checkbox" data-comp-field="loop" data-comp-id="${comp.id}" ${comp.loop ? "checked" : ""} />
				<span>Loop</span>
			</label>
		</div>
		<div class="components-field wide">
			<label class="components-checkbox-row">
				<input type="checkbox" data-comp-field="autoplay" data-comp-id="${comp.id}" ${comp.autoplay ? "checked" : ""} />
				<span>Autoplay</span>
			</label>
		</div>
	`;
}

function buildShapeBody(comp: Extract<Component, { type: "shape" }>): string {
	return `
		${field(
			"Shape",
			`<select data-comp-field="shape" data-comp-id="${comp.id}">
				${["rectangle", "circle", "triangle", "diamond", "pentagon", "hexagon", "star"].map((s) => `<option value="${s}" ${comp.shape === s ? "selected" : ""}>${s}</option>`).join("")}
			</select>`,
		)}
		<div class="components-field wide">
			<label class="components-field-label">Color</label>
			<div class="components-color-row">
				<input type="color" data-comp-field="color" data-comp-id="${comp.id}" value="${comp.color}" />
				<input type="text" data-comp-field="color" data-comp-id="${comp.id}" value="${escapeAttr(comp.color)}" />
			</div>
		</div>
		<div class="components-field wide">
			<label class="components-checkbox-row">
				<input type="checkbox" data-comp-field="filled" data-comp-id="${comp.id}" ${comp.filled ? "checked" : ""} />
				<span>Filled</span>
			</label>
		</div>
		${numberField("Stroke Width", `component:${comp.id}:strokeWidth`, comp.strokeWidth ?? 1, { step: 1, min: 0 })}
	`;
}

function buildTextBody(comp: Extract<Component, { type: "text" }>): string {
	return `
		${field("Text", `<input type="text" data-comp-field="text" data-comp-id="${comp.id}" value="${escapeAttr(comp.text)}" />`)}
		<div class="components-field wide">
			<label class="components-field-label">Color</label>
			<div class="components-color-row">
				<input type="color" data-comp-field="color" data-comp-id="${comp.id}" value="${comp.color}" />
				<input type="text" data-comp-field="color" data-comp-id="${comp.id}" value="${escapeAttr(comp.color)}" />
			</div>
		</div>
		${numberField("Font Size", `component:${comp.id}:fontSize`, comp.fontSize, { step: 1, min: 1 })}
	`;
}

// ============================================================
// Helpers
// ============================================================

function field(label: string, inputHtml: string): string {
	return `
		<div class="components-field">
			<label class="components-field-label">${escapeHtml(label)}</label>
			<div class="components-field-input">${inputHtml}</div>
		</div>
	`;
}

function numberField(label: string, fieldKey: string, value: number, opts: { step?: number; min?: number; max?: number } = {}): string {
	const stepAttr = opts.step !== undefined ? `step="${opts.step}"` : "1";
	const minAttr = opts.min !== undefined ? `min="${opts.min}"` : "";
	const maxAttr = opts.max !== undefined ? `max="${opts.max}"` : "";

	return `
		<div class="components-field">
			<label class="components-field-label">${escapeHtml(label)}</label>
			<div class="components-field-input">
				<input type="number" data-comp-field="${fieldKey}" value="${value}" ${stepAttr} ${minAttr} ${maxAttr} />
			</div>
		</div>
	`;
}

// ============================================================
// Listeners
// ============================================================

function attachListeners(): void {
	const sectionHeader = app.querySelector<HTMLDivElement>("[data-section-toggle]");
	sectionHeader?.addEventListener("click", () => {
		if (collapsedSections.has("components")) collapsedSections.delete("components");
		else collapsedSections.add("components");
		render(true);
	});

	const removeButtons = app.querySelectorAll<HTMLButtonElement>("[data-remove]");
	for (const btn of removeButtons) {
		btn.addEventListener("click", (e) => {
			e.stopPropagation();
			if (!currentObject) return;
			vscode.postMessage({
				type: "removeComponent",
				objectId: currentObject.id,
				componentId: btn.dataset.remove!,
			});
		});
	}

	const inputs = app.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("[data-comp-field]");
	for (const input of inputs) {
		const componentId = input.dataset.compId!;
		const fieldName = input.dataset.compField!;

		if (fieldName === "frames" && input instanceof HTMLTextAreaElement) {
			input.addEventListener("change", () => {
				const frames = input.value
					.split(",")
					.map((s) => s.trim())
					.filter((s) => s.length > 0);
				sendUpdate(componentId, { frames });
			});
			continue;
		}

		if (input instanceof HTMLInputElement && input.type === "checkbox") {
			input.addEventListener("change", () => sendUpdate(componentId, { [fieldName]: input.checked }));
		} else if (input instanceof HTMLInputElement && input.type === "number") {
			input.addEventListener("change", () => {
				const v = Number.parseFloat(input.value);
				if (!Number.isNaN(v)) sendUpdate(componentId, { [fieldName]: v });
			});
			input.addEventListener("keydown", (e) => {
				if (e.key === "Enter") input.blur();
			});
		} else if (input instanceof HTMLInputElement && input.type === "color") {
			input.addEventListener("input", () => {
				const textInput = input.parentElement?.querySelector<HTMLInputElement>('input[type="text"]');
				if (textInput && document.activeElement !== textInput) textInput.value = input.value;
				sendUpdate(componentId, { [fieldName]: input.value });
			});
		} else if (input instanceof HTMLInputElement) {
			input.addEventListener("change", () => sendUpdate(componentId, { [fieldName]: input.value }));
			input.addEventListener("keydown", (e) => {
				if (e.key === "Enter") input.blur();
			});
		} else if (input instanceof HTMLSelectElement) {
			input.addEventListener("change", () => sendUpdate(componentId, { [fieldName]: input.value }));
		}
	}

	const reloadButtons = app.querySelectorAll<HTMLButtonElement>("[data-reload]");
	for (const btn of reloadButtons) {
		btn.addEventListener("click", (e) => {
			e.stopPropagation();
			const texPath = btn.dataset.reloadTexture;
			if (texPath) {
				import("./atlas-cache.js").then((m) => m.reloadAtlasRegions(texPath));
			}
		});
	}

	const atlasTriggers = app.querySelectorAll<HTMLInputElement>("[data-atlas-trigger]");
	for (const input of atlasTriggers) {
		input.addEventListener("blur", () => {
			const texPath = input.value.trim();
			if (texPath) {
				import("./atlas-cache.js").then((m) => m.requestAtlasRegions(texPath));
			}
		});
	}
}

function sendUpdate(componentId: string, updates: Record<string, unknown>): void {
	if (!currentObject) return;
	vscode.postMessage({
		type: "updateComponent",
		objectId: currentObject.id,
		componentId,
		updates,
	});
}

function updateComponentFieldValuesForAll(obj: GameObject): void {
	if (!obj.components) return;
	for (const comp of obj.components) {
		const card = app.querySelector<HTMLDivElement>(`[data-card="${comp.id}"]`);
		if (!card) continue;

		const inputs = card.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("[data-comp-field]");
		for (const input of inputs) {
			if (document.activeElement === input) continue;
			const fieldName = input.dataset.compField!;

			let value: unknown;
			if (fieldName === "frames" && comp.type === "animation") {
				value = comp.frames.join(", ");
			} else if (fieldName.startsWith("component:")) {
				continue;
			} else {
				value = (comp as unknown as Record<string, unknown>)[fieldName];
			}

			if (input instanceof HTMLInputElement && input.type === "checkbox") {
				input.checked = !!value;
			} else if (input.value !== String(value ?? "")) {
				input.value = String(value ?? "");
			}
		}
	}
}

// src/webview/inspector/render/components.ts
import type { Component, ComponentType } from "../../../types/components.js";
import { COMPONENT_LABELS, COMPONENT_ICONS, COMPONENT_ORDER } from "../../../types/components.js";
import { ICONS } from "../icons.js";
import { getAtlasRegions } from "../state.js";
import { escapeAttr, escapeHtml } from "../utils.js";
import { field, fieldRow, numberField, sectionHeader } from "./section-helpers.js";
import { componentMenuOpen } from "../state.js";

// ============================================================
// Section builder
// ============================================================

export function buildComponentsSection(obj: { components?: Component[] }): string {
	const components = obj.components ?? [];

	const addMenuHtml = `
		<div class="inspector-component-add-wrap">
			<button class="inspector-component-add-btn" data-component-add-toggle>
				${ICONS.plus}
				<span>Add Component</span>
			</button>
			<div class="inspector-component-add-menu ${componentMenuOpen ? "open" : ""}" data-component-add-menu>
				${COMPONENT_ORDER.map(
					(type) => `
					<div class="inspector-component-add-item" data-component-add-type="${type}">
						<span class="inspector-component-icon">${COMPONENT_ICONS[type]}</span>
						<span>${COMPONENT_LABELS[type]}</span>
					</div>
				`,
				).join("")}
			</div>
		</div>
	`;

	if (components.length === 0) {
		return `
			<div class="inspector-section" data-section-id="components">
				${sectionHeader("components", "Components")}
				<div class="inspector-section-body">
					<div class="inspector-components-empty">No components yet.</div>
					${addMenuHtml}
				</div>
			</div>
		`;
	}

	const componentsHtml = components.map((comp) => buildComponentCard(comp)).join("");

	return `
		<div class="inspector-section" data-section-id="components">
			${sectionHeader("components", "Components")}
			<div class="inspector-section-body">
				${componentsHtml}
				${addMenuHtml}
			</div>
		</div>
	`;
}

// ============================================================
// Card builder
// ============================================================

function buildComponentCard(comp: Component): string {
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
		<div class="inspector-component-card" data-component-card="${comp.id}">
			<div class="inspector-component-header">
				<span class="inspector-component-icon">${icon}</span>
				<span class="inspector-component-label">${escapeHtml(label)}</span>
				<button class="inspector-component-remove" data-component-remove="${comp.id}" title="Remove component">${ICONS.close}</button>
			</div>
			<div class="inspector-component-body">
				${bodyHtml}
			</div>
		</div>
	`;
}

// ============================================================
// Body builders
// ============================================================

function buildSpriteBody(comp: Extract<Component, { type: "sprite" }>): string {
	return `
		${field("Texture", `<input type="text" data-component-field="texture" data-component-id="${comp.id}" value="${escapeAttr(comp.texture)}" placeholder="path/to/texture.png" />`)}
		<div class="inspector-field wide">
			<label class="inspector-field-label">Tint</label>
			<div class="inspector-color-row">
				<input type="color" data-component-field="tint" data-component-id="${comp.id}" value="${comp.tint || "#ffffff"}" />
				<input type="text" data-component-field="tint" data-component-id="${comp.id}" value="${escapeAttr(comp.tint || "#ffffff")}" />
			</div>
		</div>
		<div class="inspector-field wide">
			<label class="inspector-checkbox-row">
				<input type="checkbox" data-component-field="flipX" data-component-id="${comp.id}" ${comp.flipX ? "checked" : ""} />
				<span>Flip X</span>
			</label>
		</div>
		<div class="inspector-field wide">
			<label class="inspector-checkbox-row">
				<input type="checkbox" data-component-field="flipY" data-component-id="${comp.id}" ${comp.flipY ? "checked" : ""} />
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
		${field("Texture", `<input type="text" data-component-field="texture" data-component-id="${comp.id}" value="${escapeAttr(comp.texture)}" placeholder="path/to/texture.png" data-atlas-trigger />`)}
		${field("Atlas", `<input type="text" data-component-field="atlasPath" data-component-id="${comp.id}" value="${escapeAttr(comp.atlasPath)}" placeholder="path/to/texture.atlas" />`)}
		<div class="inspector-field">
			<label class="inspector-field-label">Region</label>
			<div class="inspector-field-input">
				<select data-component-field="region" data-component-id="${comp.id}" ${!hasRegions ? "disabled" : ""}>
					${regionOptions}
				</select>
				<button class="inspector-component-reload" data-component-reload="${comp.id}" data-component-texture="${escapeAttr(comp.texture)}" title="Reload regions">🔄</button>
			</div>
		</div>
		<div class="inspector-field wide">
			<label class="inspector-field-label">Tint</label>
			<div class="inspector-color-row">
				<input type="color" data-component-field="tint" data-component-id="${comp.id}" value="${comp.tint || "#ffffff"}" />
				<input type="text" data-component-field="tint" data-component-id="${comp.id}" value="${escapeAttr(comp.tint || "#ffffff")}" />
			</div>
		</div>
		${!hasRegions && comp.texture ? `<div class="inspector-component-hint">No atlas file found. Will render as simple texture.</div>` : ""}
	`;
}

function buildAnimationBody(comp: Extract<Component, { type: "animation" }>): string {
	return `
		${field("Atlas", `<input type="text" data-component-field="atlasPath" data-component-id="${comp.id}" value="${escapeAttr(comp.atlasPath)}" placeholder="path/to/atlas.atlas" data-atlas-trigger />`)}
		${field("Texture", `<input type="text" data-component-field="texture" data-component-id="${comp.id}" value="${escapeAttr(comp.texture)}" placeholder="path/to/texture.png" />`)}
		${field("Frames", `<textarea class="inspector-frames-textarea" data-component-field="frames" data-component-id="${comp.id}" rows="3" placeholder="frame1, frame2, frame3">${escapeHtml(comp.frames.join(", "))}</textarea>`)}
		${fieldRow(
			numberField("FPS", `component:${comp.id}:fps`, comp.fps, { step: 1, min: 1, max: 60 }),
			field(
				"Play Mode",
				`<select data-component-field="playMode" data-component-id="${comp.id}">
					${["NORMAL", "REVERSED", "LOOP", "LOOP_REVERSED", "LOOP_PINGPONG", "LOOP_RANDOM"].map((m) => `<option value="${m}" ${comp.playMode === m ? "selected" : ""}>${m}</option>`).join("")}
				</select>`,
			),
		)}
		<div class="inspector-field wide">
			<label class="inspector-checkbox-row">
				<input type="checkbox" data-component-field="loop" data-component-id="${comp.id}" ${comp.loop ? "checked" : ""} />
				<span>Loop</span>
			</label>
		</div>
		<div class="inspector-field wide">
			<label class="inspector-checkbox-row">
				<input type="checkbox" data-component-field="autoplay" data-component-id="${comp.id}" ${comp.autoplay ? "checked" : ""} />
				<span>Autoplay</span>
			</label>
		</div>
	`;
}

function buildShapeBody(comp: Extract<Component, { type: "shape" }>): string {
	return `
		${field(
			"Shape",
			`<select data-component-field="shape" data-component-id="${comp.id}">
				${["rectangle", "circle", "triangle", "diamond", "pentagon", "hexagon", "star"].map((s) => `<option value="${s}" ${comp.shape === s ? "selected" : ""}>${s}</option>`).join("")}
			</select>`,
		)}
		<div class="inspector-field wide">
			<label class="inspector-field-label">Color</label>
			<div class="inspector-color-row">
				<input type="color" data-component-field="color" data-component-id="${comp.id}" value="${comp.color}" />
				<input type="text" data-component-field="color" data-component-id="${comp.id}" value="${escapeAttr(comp.color)}" />
			</div>
		</div>
		<div class="inspector-field wide">
			<label class="inspector-checkbox-row">
				<input type="checkbox" data-component-field="filled" data-component-id="${comp.id}" ${comp.filled ? "checked" : ""} />
				<span>Filled</span>
			</label>
		</div>
		${numberField("Stroke Width", `component:${comp.id}:strokeWidth`, comp.strokeWidth ?? 1, { step: 1, min: 0 })}
	`;
}

function buildTextBody(comp: Extract<Component, { type: "text" }>): string {
	return `
		${field("Text", `<input type="text" data-component-field="text" data-component-id="${comp.id}" value="${escapeAttr(comp.text)}" />`)}
		<div class="inspector-field wide">
			<label class="inspector-field-label">Color</label>
			<div class="inspector-color-row">
				<input type="color" data-component-field="color" data-component-id="${comp.id}" value="${comp.color}" />
				<input type="text" data-component-field="color" data-component-id="${comp.id}" value="${escapeAttr(comp.color)}" />
			</div>
		</div>
		${numberField("Font Size", `component:${comp.id}:fontSize`, comp.fontSize, { step: 1, min: 1 })}
	`;
}

// ============================================================
// Field value updater (وقتی پیام update از extension میاد)
// ============================================================

export function updateComponentFieldValues(comp: Component, container: HTMLElement): void {
	const card = container.querySelector<HTMLDivElement>(`[data-component-card="${comp.id}"]`);
	if (!card) return;

	const inputs = card.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("[data-component-field]");
	for (const input of inputs) {
		if (document.activeElement === input) continue;
		const fieldName = input.dataset.componentField!;

		let value: unknown;
		if (fieldName === "frames" && comp.type === "animation") {
			value = comp.frames.join(", ");
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

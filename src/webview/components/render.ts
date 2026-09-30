// src/webview/components/render.ts
import type { GameObject } from "../../types/scene.js";
import type { Component, ComponentType } from "../../types/components.js";
import { COMPONENT_LABELS, COMPONENT_ICONS, getAvailableLogicComponentTypes, isVisualComponent } from "../../types/components.js";
import { app, vscode } from "./vscode-api.js";
import { currentObject, currentObjectId, setCurrentObjectId, multiSelection, componentMenuOpen, setComponentMenuOpen, collapsedSections } from "./state.js";
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
			${buildLogicComponentsSection(obj)}
		</div>
	`;
}

function buildLogicComponentsSection(obj: { components?: Component[] }): string {
	const allComponents = obj.components ?? [];
	const logicComponents = allComponents.filter((c) => !isVisualComponent(c.type));
	const collapsed = collapsedSections.has("components");

	const availableTypes = getAvailableLogicComponentTypes(allComponents);

	const addMenuHtml =
		availableTypes.length === 0
			? `<div class="components-empty-inner">All logic component types are already attached.</div>`
			: `
		<div class="components-add-wrap">
			<button class="components-add-btn" data-add-toggle>
				${ICONS.plus}
				<span>Add Component</span>
			</button>
			<div class="components-add-menu ${componentMenuOpen ? "open" : ""}" data-add-menu>
				${availableTypes
					.map(
						(type) => `
					<div class="components-add-item" data-add-type="${type}">
						<span style="display:inline-block;width:16px;text-align:center;">${COMPONENT_ICONS[type]}</span>
						<span>${COMPONENT_LABELS[type]}</span>
					</div>
				`,
					)
					.join("")}
			</div>
		</div>
	`;

	const componentsHtml = logicComponents.length === 0 ? `<div class="components-empty-inner">No logic components attached.<br/>Use "Add Component" to add physics, colliders, scripts, etc.</div>` : logicComponents.map((c) => buildCard(c)).join("");

	return `
		<div class="components-section">
			<div class="components-section-header" data-section-toggle="components">
				<span class="components-section-chevron">${collapsed ? ICONS.chevronRight : ICONS.chevron}</span>
				<span class="components-section-label">Components</span>
			</div>
			<div class="components-section-body" style="${collapsed ? "display:none;" : ""}">
				${componentsHtml}
				${addMenuHtml}
			</div>
		</div>
	`;
}

function buildCard(comp: Component): string {
	const icon = COMPONENT_ICONS[comp.type];
	const label = COMPONENT_LABELS[comp.type];

	let bodyHtml = "";
	switch (comp.type) {
		case "physics":
			bodyHtml = buildPhysicsBody(comp);
			break;
		case "collider":
			bodyHtml = buildColliderBody(comp);
			break;
		case "script":
			bodyHtml = buildScriptBody(comp);
			break;
		case "tag":
			bodyHtml = buildTagBody(comp);
			break;
		case "custom":
			bodyHtml = buildCustomBody(comp);
			break;
		default:
			bodyHtml = `<div class="components-hint">This component has no editable fields.</div>`;
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

function buildPhysicsBody(comp: Extract<Component, { type: "physics" }>): string {
	return `
		${field(
			"Body Type",
			`<select data-comp-field="bodyType" data-comp-id="${comp.id}">
				${["dynamic", "static", "kinematic"].map((t) => `<option value="${t}" ${comp.bodyType === t ? "selected" : ""}>${t}</option>`).join("")}
			</select>`,
		)}
		${numberField("Mass", `component:${comp.id}:mass`, comp.mass, { step: 0.1, min: 0 })}
		${numberField("Gravity Scale", `component:${comp.id}:gravityScale`, comp.gravityScale, { step: 0.1 })}
		<div class="components-field-row">
			${numberField("Velocity X", `component:${comp.id}:velocityX`, comp.velocityX, { step: 1 })}
			${numberField("Velocity Y", `component:${comp.id}:velocityY`, comp.velocityY, { step: 1 })}
		</div>
		<div class="components-field-row">
			${numberField("Lin. Damping", `component:${comp.id}:linearDamping`, comp.linearDamping, { step: 0.1, min: 0 })}
			${numberField("Ang. Damping", `component:${comp.id}:angularDamping`, comp.angularDamping, { step: 0.1, min: 0 })}
		</div>
		<div class="components-field wide">
			<label class="components-checkbox-row">
				<input type="checkbox" data-comp-field="fixedRotation" data-comp-id="${comp.id}" ${comp.fixedRotation ? "checked" : ""} />
				<span>Fixed Rotation</span>
			</label>
		</div>
	`;
}

function buildColliderBody(comp: Extract<Component, { type: "collider" }>): string {
	return `
		${field(
			"Shape",
			`<select data-comp-field="shape" data-comp-id="${comp.id}">
				${["box", "circle", "polygon"].map((s) => `<option value="${s}" ${comp.shape === s ? "selected" : ""}>${s}</option>`).join("")}
			</select>`,
		)}
		<div class="components-field-row">
			${numberField("Width", `component:${comp.id}:width`, comp.width, { step: 1, min: 1 })}
			${numberField("Height", `component:${comp.id}:height`, comp.height, { step: 1, min: 1 })}
		</div>
		${numberField("Radius", `component:${comp.id}:radius`, comp.radius, { step: 1, min: 1 })}
		<div class="components-field-row">
			${numberField("Friction", `component:${comp.id}:friction`, comp.friction, { step: 0.05, min: 0 })}
			${numberField("Restitution", `component:${comp.id}:restitution`, comp.restitution, { step: 0.05, min: 0, max: 1 })}
		</div>
		<div class="components-field wide">
			<label class="components-checkbox-row">
				<input type="checkbox" data-comp-field="isTrigger" data-comp-id="${comp.id}" ${comp.isTrigger ? "checked" : ""} />
				<span>Is Trigger</span>
			</label>
		</div>
	`;
}

function buildScriptBody(comp: Extract<Component, { type: "script" }>): string {
	return `
		${field("Class Name", `<input type="text" data-comp-field="className" data-comp-id="${comp.id}" value="${escapeAttr(comp.className)}" />`)}
		${field("Script Path", `<input type="text" data-comp-field="scriptPath" data-comp-id="${comp.id}" value="${escapeAttr(comp.scriptPath)}" placeholder="path/to/Script.java" />`)}
		${field("Properties (JSON)", `<textarea class="components-frames-textarea" data-comp-field="propertiesJson" data-comp-id="${comp.id}" rows="3">${escapeHtml(comp.propertiesJson)}</textarea>`)}
		<div class="components-field wide">
			<label class="components-checkbox-row">
				<input type="checkbox" data-comp-field="enabled" data-comp-id="${comp.id}" ${comp.enabled ? "checked" : ""} />
				<span>Enabled</span>
			</label>
		</div>
	`;
}

function buildTagBody(comp: Extract<Component, { type: "tag" }>): string {
	return `
		${field("Tags", `<input type="text" data-comp-field="tags" data-comp-id="${comp.id}" value="${escapeAttr(comp.tags.join(", "))}" placeholder="player, enemy, pickup" />`)}
		<div class="components-hint">Comma-separated list of tags.</div>
	`;
}

function buildCustomBody(comp: Extract<Component, { type: "custom" }>): string {
	return `
		${field("Name", `<input type="text" data-comp-field="name" data-comp-id="${comp.id}" value="${escapeAttr(comp.name)}" />`)}
		${field("Properties (JSON)", `<textarea class="components-frames-textarea" data-comp-field="propertiesJson" data-comp-id="${comp.id}" rows="4">${escapeHtml(comp.propertiesJson)}</textarea>`)}
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

let outsideClickInstalled = false;
function installOutsideClickListenerOnce(): void {
	if (outsideClickInstalled) return;
	outsideClickInstalled = true;

	document.addEventListener("click", () => {
		if (componentMenuOpen) {
			setComponentMenuOpen(false);
			app.querySelector("[data-add-menu]")?.classList.remove("open");
		}
	});
}

function attachListeners(): void {
	installOutsideClickListenerOnce();

	const sectionHeader = app.querySelector<HTMLDivElement>("[data-section-toggle]");
	sectionHeader?.addEventListener("click", () => {
		if (collapsedSections.has("components")) collapsedSections.delete("components");
		else collapsedSections.add("components");
		render(true);
	});

	const addToggle = app.querySelector<HTMLButtonElement>("[data-add-toggle]");
	const addMenu = app.querySelector<HTMLDivElement>("[data-add-menu]");
	addToggle?.addEventListener("click", (e) => {
		e.stopPropagation();
		const next = !componentMenuOpen;
		setComponentMenuOpen(next);
		addMenu?.classList.toggle("open", next);
	});

	const addItems = app.querySelectorAll<HTMLDivElement>("[data-add-type]");
	for (const item of addItems) {
		item.addEventListener("click", (e) => {
			e.stopPropagation();
			if (!currentObject) return;
			const type = item.dataset.addType as ComponentType;
			setComponentMenuOpen(false);
			vscode.postMessage({
				type: "addComponent",
				objectId: currentObject.id,
				componentType: type,
			});
		});
	}

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

		if ((fieldName === "propertiesJson" || fieldName === "tags") && input instanceof HTMLTextAreaElement) {
			input.addEventListener("change", () => {
				if (fieldName === "tags") {
					const tags = input.value
						.split(",")
						.map((s) => s.trim())
						.filter((s) => s.length > 0);
					sendUpdate(componentId, { tags });
				} else {
					sendUpdate(componentId, { [fieldName]: input.value });
				}
			});
			continue;
		}

		if ((fieldName === "propertiesJson" || fieldName === "tags") && input instanceof HTMLInputElement) {
			input.addEventListener("change", () => {
				if (fieldName === "tags") {
					const tags = input.value
						.split(",")
						.map((s) => s.trim())
						.filter((s) => s.length > 0);
					sendUpdate(componentId, { tags });
				} else {
					sendUpdate(componentId, { [fieldName]: input.value });
				}
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
		} else if (input instanceof HTMLInputElement) {
			input.addEventListener("change", () => sendUpdate(componentId, { [fieldName]: input.value }));
			input.addEventListener("keydown", (e) => {
				if (e.key === "Enter") input.blur();
			});
		} else if (input instanceof HTMLSelectElement) {
			input.addEventListener("change", () => sendUpdate(componentId, { [fieldName]: input.value }));
		}
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
			if (fieldName === "tags" && comp.type === "tag") {
				value = comp.tags.join(", ");
			} else if (fieldName === "propertiesJson" && (comp.type === "script" || comp.type === "custom")) {
				value = comp.propertiesJson;
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
} // src/webview/components/render.ts
import type { GameObject } from "../../types/scene.js";
import type { Component, ComponentType } from "../../types/components.js";
import { COMPONENT_LABELS, COMPONENT_ICONS, getAvailableLogicComponentTypes, isVisualComponent } from "../../types/components.js";
import { app, vscode } from "./vscode-api.js";
import { currentObject, currentObjectId, setCurrentObjectId, multiSelection, componentMenuOpen, setComponentMenuOpen, collapsedSections } from "./state.js";
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
			${buildLogicComponentsSection(obj)}
		</div>
	`;
}

function buildLogicComponentsSection(obj: { components?: Component[] }): string {
	const allComponents = obj.components ?? [];
	const logicComponents = allComponents.filter((c) => !isVisualComponent(c.type));
	const collapsed = collapsedSections.has("components");

	const availableTypes = getAvailableLogicComponentTypes(allComponents);

	const addMenuHtml =
		availableTypes.length === 0
			? `<div class="components-empty-inner">All logic component types are already attached.</div>`
			: `
		<div class="components-add-wrap">
			<button class="components-add-btn" data-add-toggle>
				${ICONS.plus}
				<span>Add Component</span>
			</button>
			<div class="components-add-menu ${componentMenuOpen ? "open" : ""}" data-add-menu>
				${availableTypes
					.map(
						(type) => `
					<div class="components-add-item" data-add-type="${type}">
						<span style="display:inline-block;width:16px;text-align:center;">${COMPONENT_ICONS[type]}</span>
						<span>${COMPONENT_LABELS[type]}</span>
					</div>
				`,
					)
					.join("")}
			</div>
		</div>
	`;

	const componentsHtml = logicComponents.length === 0 ? `<div class="components-empty-inner">No logic components attached.<br/>Use "Add Component" to add physics, colliders, scripts, etc.</div>` : logicComponents.map((c) => buildCard(c)).join("");

	return `
		<div class="components-section">
			<div class="components-section-header" data-section-toggle="components">
				<span class="components-section-chevron">${collapsed ? ICONS.chevronRight : ICONS.chevron}</span>
				<span class="components-section-label">Components</span>
			</div>
			<div class="components-section-body" style="${collapsed ? "display:none;" : ""}">
				${componentsHtml}
				${addMenuHtml}
			</div>
		</div>
	`;
}

function buildCard(comp: Component): string {
	const icon = COMPONENT_ICONS[comp.type];
	const label = COMPONENT_LABELS[comp.type];

	let bodyHtml = "";
	switch (comp.type) {
		case "physics":
			bodyHtml = buildPhysicsBody(comp);
			break;
		case "collider":
			bodyHtml = buildColliderBody(comp);
			break;
		case "script":
			bodyHtml = buildScriptBody(comp);
			break;
		case "tag":
			bodyHtml = buildTagBody(comp);
			break;
		case "custom":
			bodyHtml = buildCustomBody(comp);
			break;
		default:
			bodyHtml = `<div class="components-hint">This component has no editable fields.</div>`;
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

function buildPhysicsBody(comp: Extract<Component, { type: "physics" }>): string {
	return `
		${field(
			"Body Type",
			`<select data-comp-field="bodyType" data-comp-id="${comp.id}">
				${["dynamic", "static", "kinematic"].map((t) => `<option value="${t}" ${comp.bodyType === t ? "selected" : ""}>${t}</option>`).join("")}
			</select>`,
		)}
		${numberField("Mass", `component:${comp.id}:mass`, comp.mass, { step: 0.1, min: 0 })}
		${numberField("Gravity Scale", `component:${comp.id}:gravityScale`, comp.gravityScale, { step: 0.1 })}
		<div class="components-field-row">
			${numberField("Velocity X", `component:${comp.id}:velocityX`, comp.velocityX, { step: 1 })}
			${numberField("Velocity Y", `component:${comp.id}:velocityY`, comp.velocityY, { step: 1 })}
		</div>
		<div class="components-field-row">
			${numberField("Lin. Damping", `component:${comp.id}:linearDamping`, comp.linearDamping, { step: 0.1, min: 0 })}
			${numberField("Ang. Damping", `component:${comp.id}:angularDamping`, comp.angularDamping, { step: 0.1, min: 0 })}
		</div>
		<div class="components-field wide">
			<label class="components-checkbox-row">
				<input type="checkbox" data-comp-field="fixedRotation" data-comp-id="${comp.id}" ${comp.fixedRotation ? "checked" : ""} />
				<span>Fixed Rotation</span>
			</label>
		</div>
	`;
}

function buildColliderBody(comp: Extract<Component, { type: "collider" }>): string {
	return `
		${field(
			"Shape",
			`<select data-comp-field="shape" data-comp-id="${comp.id}">
				${["box", "circle", "polygon"].map((s) => `<option value="${s}" ${comp.shape === s ? "selected" : ""}>${s}</option>`).join("")}
			</select>`,
		)}
		<div class="components-field-row">
			${numberField("Width", `component:${comp.id}:width`, comp.width, { step: 1, min: 1 })}
			${numberField("Height", `component:${comp.id}:height`, comp.height, { step: 1, min: 1 })}
		</div>
		${numberField("Radius", `component:${comp.id}:radius`, comp.radius, { step: 1, min: 1 })}
		<div class="components-field-row">
			${numberField("Friction", `component:${comp.id}:friction`, comp.friction, { step: 0.05, min: 0 })}
			${numberField("Restitution", `component:${comp.id}:restitution`, comp.restitution, { step: 0.05, min: 0, max: 1 })}
		</div>
		<div class="components-field wide">
			<label class="components-checkbox-row">
				<input type="checkbox" data-comp-field="isTrigger" data-comp-id="${comp.id}" ${comp.isTrigger ? "checked" : ""} />
				<span>Is Trigger</span>
			</label>
		</div>
	`;
}

function buildScriptBody(comp: Extract<Component, { type: "script" }>): string {
	return `
		${field("Class Name", `<input type="text" data-comp-field="className" data-comp-id="${comp.id}" value="${escapeAttr(comp.className)}" />`)}
		${field("Script Path", `<input type="text" data-comp-field="scriptPath" data-comp-id="${comp.id}" value="${escapeAttr(comp.scriptPath)}" placeholder="path/to/Script.java" />`)}
		${field("Properties (JSON)", `<textarea class="components-frames-textarea" data-comp-field="propertiesJson" data-comp-id="${comp.id}" rows="3">${escapeHtml(comp.propertiesJson)}</textarea>`)}
		<div class="components-field wide">
			<label class="components-checkbox-row">
				<input type="checkbox" data-comp-field="enabled" data-comp-id="${comp.id}" ${comp.enabled ? "checked" : ""} />
				<span>Enabled</span>
			</label>
		</div>
	`;
}

function buildTagBody(comp: Extract<Component, { type: "tag" }>): string {
	return `
		${field("Tags", `<input type="text" data-comp-field="tags" data-comp-id="${comp.id}" value="${escapeAttr(comp.tags.join(", "))}" placeholder="player, enemy, pickup" />`)}
		<div class="components-hint">Comma-separated list of tags.</div>
	`;
}

function buildCustomBody(comp: Extract<Component, { type: "custom" }>): string {
	return `
		${field("Name", `<input type="text" data-comp-field="name" data-comp-id="${comp.id}" value="${escapeAttr(comp.name)}" />`)}
		${field("Properties (JSON)", `<textarea class="components-frames-textarea" data-comp-field="propertiesJson" data-comp-id="${comp.id}" rows="4">${escapeHtml(comp.propertiesJson)}</textarea>`)}
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

let outsideClickInstalled = false;
function installOutsideClickListenerOnce(): void {
	if (outsideClickInstalled) return;
	outsideClickInstalled = true;

	document.addEventListener("click", () => {
		if (componentMenuOpen) {
			setComponentMenuOpen(false);
			app.querySelector("[data-add-menu]")?.classList.remove("open");
		}
	});
}

function attachListeners(): void {
	installOutsideClickListenerOnce();

	const sectionHeader = app.querySelector<HTMLDivElement>("[data-section-toggle]");
	sectionHeader?.addEventListener("click", () => {
		if (collapsedSections.has("components")) collapsedSections.delete("components");
		else collapsedSections.add("components");
		render(true);
	});

	const addToggle = app.querySelector<HTMLButtonElement>("[data-add-toggle]");
	const addMenu = app.querySelector<HTMLDivElement>("[data-add-menu]");
	addToggle?.addEventListener("click", (e) => {
		e.stopPropagation();
		const next = !componentMenuOpen;
		setComponentMenuOpen(next);
		addMenu?.classList.toggle("open", next);
	});

	const addItems = app.querySelectorAll<HTMLDivElement>("[data-add-type]");
	for (const item of addItems) {
		item.addEventListener("click", (e) => {
			e.stopPropagation();
			if (!currentObject) return;
			const type = item.dataset.addType as ComponentType;
			setComponentMenuOpen(false);
			vscode.postMessage({
				type: "addComponent",
				objectId: currentObject.id,
				componentType: type,
			});
		});
	}

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

		if ((fieldName === "propertiesJson" || fieldName === "tags") && input instanceof HTMLTextAreaElement) {
			input.addEventListener("change", () => {
				if (fieldName === "tags") {
					const tags = input.value
						.split(",")
						.map((s) => s.trim())
						.filter((s) => s.length > 0);
					sendUpdate(componentId, { tags });
				} else {
					sendUpdate(componentId, { [fieldName]: input.value });
				}
			});
			continue;
		}

		if ((fieldName === "propertiesJson" || fieldName === "tags") && input instanceof HTMLInputElement) {
			input.addEventListener("change", () => {
				if (fieldName === "tags") {
					const tags = input.value
						.split(",")
						.map((s) => s.trim())
						.filter((s) => s.length > 0);
					sendUpdate(componentId, { tags });
				} else {
					sendUpdate(componentId, { [fieldName]: input.value });
				}
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
		} else if (input instanceof HTMLInputElement) {
			input.addEventListener("change", () => sendUpdate(componentId, { [fieldName]: input.value }));
			input.addEventListener("keydown", (e) => {
				if (e.key === "Enter") input.blur();
			});
		} else if (input instanceof HTMLSelectElement) {
			input.addEventListener("change", () => sendUpdate(componentId, { [fieldName]: input.value }));
		}
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
			if (fieldName === "tags" && comp.type === "tag") {
				value = comp.tags.join(", ");
			} else if (fieldName === "propertiesJson" && (comp.type === "script" || comp.type === "custom")) {
				value = comp.propertiesJson;
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

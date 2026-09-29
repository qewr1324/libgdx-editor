// src/webview/inspector/render/section-helpers.ts
import { ICONS } from "../icons.js";
import { collapsedSections } from "../state.js";
import { escapeHtml } from "../utils.js";

export function sectionHeader(id: string, label: string, opts: { reset?: boolean } = {}): string {
	const collapsed = collapsedSections.has(id);
	const chevron = collapsed ? ICONS.chevronRight : ICONS.chevron;
	const resetBtn = opts.reset ? `<button class="inspector-section-reset" data-section-reset="${id}" title="Reset">${ICONS.reset}</button>` : "";

	return `
		<div class="inspector-section-header" data-section-toggle="${id}">
			<span class="inspector-section-chevron">${chevron}</span>
			<span class="inspector-section-label">${escapeHtml(label)}</span>
			${resetBtn}
		</div>
	`;
}

export function sectionWrap(id: string, label: string, content: string, opts: { reset?: boolean } = {}): string {
	const collapsed = collapsedSections.has(id);
	return `
		<div class="inspector-section ${collapsed ? "collapsed" : ""}" data-section-id="${id}">
			${sectionHeader(id, label, opts)}
			<div class="inspector-section-body">${content}</div>
		</div>
	`;
}

export function field(label: string, inputHtml: string): string {
	return `
		<div class="inspector-field">
			<label class="inspector-field-label">${escapeHtml(label)}</label>
			<div class="inspector-field-input">${inputHtml}</div>
		</div>
	`;
}

export function numberField(label: string, fieldKey: string, value: number, opts: { step?: number; min?: number; max?: number; sensitivity?: number } = {}): string {
	const sensitivity = opts.sensitivity ?? (opts.step && opts.step < 1 ? 0.01 : 1);
	const minAttr = opts.min !== undefined ? `min="${opts.min}"` : "";
	const maxAttr = opts.max !== undefined ? `max="${opts.max}"` : "";
	const stepAttr = opts.step !== undefined ? `step="${opts.step}"` : "1";

	return `
		<div class="inspector-field">
			<label class="inspector-field-label">${escapeHtml(label)}</label>
			<div class="inspector-field-input">
				<div class="inspector-number-wrap">
					<div class="inspector-drag-handle" data-drag-field="${fieldKey}" data-drag-sensitivity="${sensitivity}" title="Drag to change">
						${ICONS.drag}
					</div>
					<input type="number" data-field="${fieldKey}" value="${value}" step="${stepAttr}" ${minAttr} ${maxAttr} />
				</div>
			</div>
		</div>
	`;
}

export function fieldRow(field1: string, field2: string): string {
	return `<div class="inspector-field-row">${field1}${field2}</div>`;
}

export function subHeader(label: string): string {
	return `<div class="inspector-subheader">${escapeHtml(label)}</div>`;
}

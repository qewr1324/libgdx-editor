import { animation, selectedTrackIndex, selectedKeyframeIndex } from "../state.js";
import type { EasingType } from "../../../animator/animatorConfig.js";
import { EASING_OPTIONS } from "../../../animator/animatorConfig.js";

export interface KeyframeInspectorCallbacks {
	onKeyframeChanged(trackIndex: number, kfIndex: number, patch: { time?: number; value?: number | string; easing?: EasingType }): void;
	onKeyframeDeleted(trackIndex: number, kfIndex: number): void;
}

let callbacks: KeyframeInspectorCallbacks | null = null;
let container: HTMLElement | null = null;

export function setupKeyframeInspector(el: HTMLElement, cb: KeyframeInspectorCallbacks): void {
	container = el;
	callbacks = cb;
	render();
}

export function rerenderKeyframeInspector(): void {
	render();
}

function render(): void {
	if (!container) return;
	if (!animation) {
		container.innerHTML = `<div class="kf-empty">No animation</div>`;
		return;
	}

	if (selectedTrackIndex < 0 || selectedKeyframeIndex < 0) {
		container.innerHTML = `<div class="kf-empty">Select a keyframe</div>`;
		return;
	}

	const track = animation.tracks[selectedTrackIndex];
	if (!track) {
		container.innerHTML = `<div class="kf-empty">No track</div>`;
		return;
	}
	const kfsSorted = [...track.keyframes].sort((a, b) => a.time - b.time);
	const kf = kfsSorted[selectedKeyframeIndex];
	if (!kf) {
		container.innerHTML = `<div class="kf-empty">No keyframe</div>`;
		return;
	}

	const isNumeric = typeof kf.value === "number";

	container.innerHTML = `
		<div class="kf-inspector">
			<div class="kf-header">Keyframe</div>
			<div class="kf-field">
				<label>Track</label>
				<div class="kf-value">${escapeHtml(track.property)}</div>
			</div>
			<div class="kf-field">
				<label>Time (ms)</label>
				<input type="number" data-kf-time value="${kf.time}" step="1" min="0" />
			</div>
			<div class="kf-field">
				<label>Value</label>
				<input type="number" data-kf-value value="${kf.value}" step="${isNumeric ? 1 : 1}" ${isNumeric ? "" : "disabled"} />
			</div>
			<div class="kf-field">
				<label>Easing</label>
				<select data-kf-easing>
					${EASING_OPTIONS.map((e) => `<option value="${e}" ${kf.easing === e ? "selected" : ""}>${e}</option>`).join("")}
				</select>
			</div>
			<button class="kf-delete" data-kf-delete>🗑 Delete Keyframe</button>
		</div>
	`;

	attachListeners();
}

function attachListeners(): void {
	if (!container) return;

	const timeInput = container.querySelector<HTMLInputElement>("[data-kf-time]");
	const valueInput = container.querySelector<HTMLInputElement>("[data-kf-value]");
	const easingSelect = container.querySelector<HTMLSelectElement>("[data-kf-easing]");
	const deleteBtn = container.querySelector<HTMLButtonElement>("[data-kf-delete]");

	timeInput?.addEventListener("change", () => {
		const time = parseFloat(timeInput.value);
		if (!Number.isNaN(time) && callbacks) {
			callbacks.onKeyframeChanged(selectedTrackIndex, selectedKeyframeIndex, { time });
		}
	});

	valueInput?.addEventListener("change", () => {
		const value = parseFloat(valueInput.value);
		if (!Number.isNaN(value) && callbacks) {
			callbacks.onKeyframeChanged(selectedTrackIndex, selectedKeyframeIndex, { value });
		}
	});

	easingSelect?.addEventListener("change", () => {
		const easing = easingSelect.value as EasingType;
		if (callbacks) {
			callbacks.onKeyframeChanged(selectedTrackIndex, selectedKeyframeIndex, { easing });
		}
	});

	deleteBtn?.addEventListener("click", () => {
		if (callbacks) {
			callbacks.onKeyframeDeleted(selectedTrackIndex, selectedKeyframeIndex);
		}
	});
}

function escapeHtml(s: string): string {
	return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

import { animation, playing, currentTime, sceneName } from "../state.js";
import type { Animation } from "../../../animator/animatorConfig.js";

export interface ToolbarCallbacks {
	onPlay(): void;
	onPause(): void;
	onStop(): void;
	onStepForward(): void;
	onStepBackward(): void;
	onJumpToStart(): void;
	onJumpToEnd(): void;
	onToggleLoop(): void;
	onMetadataChanged(patch: Partial<Animation>): void;
	onSourceSceneChanged(sceneName: string): void;
	onSave(): void;
}

let callbacks: ToolbarCallbacks | null = null;
let container: HTMLElement | null = null;

export function setupToolbar(el: HTMLElement, cb: ToolbarCallbacks): void {
	container = el;
	callbacks = cb;
	render();
}

export function rerenderToolbar(): void {
	render();
}

/**
 * ✅ فقط دکمه play/pause رو آپدیت می‌کنه — بدون بازسازی کل toolbar
 */
export function updateToolbarPlayButton(isPlaying: boolean): void {
	if (!container) return;
	const btn = container.querySelector<HTMLButtonElement>('[data-action="play-pause"]');
	if (!btn) return;
	if (isPlaying) {
		btn.textContent = "⏸";
		btn.classList.add("active");
	} else {
		btn.textContent = "▶";
		btn.classList.remove("active");
	}
	// زمان فعلی رو هم آپدیت کن
	const timeDisplay = container.querySelector<HTMLSpanElement>(".anim-time-display");
	if (timeDisplay && animation) {
		timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(animation.duration)}`;
	}
}

function render(): void {
	if (!container) return;
	if (!animation) {
		container.innerHTML = `<div class="anim-toolbar"><span>No animation</span></div>`;
		return;
	}
	const a = animation;

	container.innerHTML = `
		<div class="anim-toolbar">
			<div class="anim-toolbar-group">
				<button class="anim-btn" data-action="jump-start" title="Jump to Start">⏮</button>
				<button class="anim-btn" data-action="step-back" title="Previous Frame">⏪</button>
				<button class="anim-btn ${playing ? "active" : ""}" data-action="play-pause" title="Play/Pause">
					${playing ? "⏸" : "▶"}
				</button>
				<button class="anim-btn" data-action="stop" title="Stop">⏹</button>
				<button class="anim-btn" data-action="step-fwd" title="Next Frame">⏩</button>
				<button class="anim-btn" data-action="jump-end" title="Jump to End">⏭</button>
			</div>

			<div class="anim-toolbar-group">
				<span class="anim-time-display">${formatTime(currentTime)} / ${formatTime(a.duration)}</span>
			</div>

			<div class="anim-toolbar-group">
				<label class="anim-checkbox">
					<input type="checkbox" data-loop ${a.loop ? "checked" : ""} />
					<span>Loop</span>
				</label>
			</div>

			<div class="anim-toolbar-group">
				<label class="anim-toolbar-label">Duration</label>
				<input type="number" class="anim-toolbar-input" data-duration value="${a.duration}" step="100" min="100" />
				<label class="anim-toolbar-label">FPS</label>
				<input type="number" class="anim-toolbar-input" data-fps value="${a.fps}" step="1" min="1" max="120" />
			</div>

			<div class="anim-toolbar-group">
				<label class="anim-toolbar-label">Scene</label>
				<span class="anim-toolbar-value">${escapeHtml(sceneName ?? "(none)")}</span>
			</div>

			<div class="anim-toolbar-spacer"></div>

			<button class="anim-btn anim-btn-primary" data-action="save" title="Save (Ctrl+S)">💾 Save</button>
		</div>
	`;

	attachListeners();
}

function attachListeners(): void {
	if (!container || !callbacks) return;

	container.querySelector('[data-action="jump-start"]')?.addEventListener("click", () => callbacks!.onJumpToStart());
	container.querySelector('[data-action="step-back"]')?.addEventListener("click", () => callbacks!.onStepBackward());
	container.querySelector('[data-action="play-pause"]')?.addEventListener("click", () => {
		if (playing) callbacks!.onPause();
		else callbacks!.onPlay();
	});
	container.querySelector('[data-action="stop"]')?.addEventListener("click", () => callbacks!.onStop());
	container.querySelector('[data-action="step-fwd"]')?.addEventListener("click", () => callbacks!.onStepForward());
	container.querySelector('[data-action="jump-end"]')?.addEventListener("click", () => callbacks!.onJumpToEnd());
	container.querySelector('[data-action="save"]')?.addEventListener("click", () => callbacks!.onSave());

	container.querySelector<HTMLInputElement>("[data-loop]")?.addEventListener("change", (e) => {
		const target = e.target as HTMLInputElement;
		callbacks!.onToggleLoop();
		callbacks!.onMetadataChanged({ loop: target.checked });
	});

	container.querySelector<HTMLInputElement>("[data-duration]")?.addEventListener("change", (e) => {
		const target = e.target as HTMLInputElement;
		const value = Math.max(100, Number.parseInt(target.value, 10));
		if (!Number.isNaN(value)) {
			callbacks!.onMetadataChanged({ duration: value });
		}
	});

	container.querySelector<HTMLInputElement>("[data-fps]")?.addEventListener("change", (e) => {
		const target = e.target as HTMLInputElement;
		const value = Math.max(1, Math.min(120, Number.parseInt(target.value, 10)));
		if (!Number.isNaN(value)) {
			callbacks!.onMetadataChanged({ fps: value });
		}
	});
}

function formatTime(ms: number): string {
	return `${Math.round(ms)}ms`;
}

function escapeHtml(s: string): string {
	return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

import { animation, currentTime, selectedTrackIndex, selectedKeyframeIndex, setSelectedTrackIndex, setSelectedKeyframeIndex } from "../state.js";
import type { Animation, Keyframe, Track } from "../../../animator/animatorConfig.js";

export interface TimelineCallbacks {
	onSeek(timeMs: number): void;
	onTrackSelected(index: number): void;
	onKeyframeSelected(trackIndex: number, kfIndex: number): void;
	onKeyframeMoved(trackIndex: number, kfIndex: number, newTime: number): void;
	onKeyframeAdded(trackIndex: number, time: number): void;
	onKeyframeRemoved(trackIndex: number, kfIndex: number): void;
	onTrackAdded(): void;
	onTrackRemoved(trackIndex: number): void;
}

let callbacks: TimelineCallbacks | null = null;
let container: HTMLElement | null = null;

export function setupTimelinePanel(el: HTMLElement, cb: TimelineCallbacks): void {
	container = el;
	callbacks = cb;
	render();
}

export function rerenderTimeline(): void {
	render();
}

export function updatePlayheadPosition(timeMs: number): void {
	if (!container || !animation) return;
	const playhead = container.querySelector<HTMLElement>(".timeline-playhead");
	if (playhead) {
		const pct = (timeMs / animation.duration) * 100;
		playhead.style.left = `${pct}%`;
	}
}

function render(): void {
	if (!container) return;
	if (!animation) {
		container.innerHTML = `<div class="timeline-empty">No animation loaded</div>`;
		return;
	}

	const a = animation;
	const ticks: string[] = [];
	const stepMs = calculateTickStep(a.duration);
	for (let t = 0; t <= a.duration; t += stepMs) {
		const pct = (t / a.duration) * 100;
		ticks.push(`<div class="timeline-tick" style="left:${pct}%"><span>${formatTime(t)}</span></div>`);
	}

	const tracksHtml = a.tracks.map((track, ti) => renderTrackRow(track, ti, a.duration)).join("");

	const playheadPct = (currentTime / a.duration) * 100;

	container.innerHTML = `
		<div class="timeline">
			<div class="timeline-header">
				<div class="timeline-header-left">Timeline</div>
				<div class="timeline-header-controls">
					<button class="tl-btn" data-action="add-track" title="Add Track">+ Track</button>
				</div>
			</div>
			<div class="timeline-body">
				<div class="timeline-track-labels">
					<div class="timeline-label-header">Tracks</div>
					${a.tracks
						.map(
							(track, ti) => `
						<div class="timeline-label ${ti === selectedTrackIndex ? "selected" : ""}" data-track-label="${ti}">
							<div class="timeline-label-name">${escapeHtml(track.property)}</div>
							<div class="timeline-label-obj">${escapeHtml(shortId(track.objectId))}</div>
							<button class="timeline-label-del" data-remove-track="${ti}" title="Remove">✖</button>
						</div>
					`,
						)
						.join("")}
				</div>
				<div class="timeline-canvas-wrap">
					<div class="timeline-ruler">
						${ticks.join("")}
					</div>
					<div class="timeline-tracks">
						${tracksHtml}
					</div>
					<div class="timeline-playhead" style="left:${playheadPct}%"></div>
				</div>
			</div>
		</div>
	`;

	attachListeners();
}

function renderTrackRow(track: Track, trackIndex: number, duration: number): string {
	const kfs = [...track.keyframes].sort((a, b) => a.time - b.time);

	const keyframesHtml = kfs
		.map((kf, kfIndex) => {
			const pct = (kf.time / duration) * 100;
			const isSelected = trackIndex === selectedTrackIndex && kfIndex === selectedKeyframeIndex;
			return `<div class="timeline-keyframe ${isSelected ? "selected" : ""}" style="left:${pct}%" data-track="${trackIndex}" data-kf="${kfIndex}" title="${formatTime(kf.time)} → ${kf.value}"></div>`;
		})
		.join("");

	// خط اتصال بین کی‌فریم‌ها
	const lineSegments: string[] = [];
	for (let i = 0; i < kfs.length - 1; i++) {
		const startPct = (kfs[i].time / duration) * 100;
		const endPct = (kfs[i + 1].time / duration) * 100;
		lineSegments.push(`<div class="timeline-segment" style="left:${startPct}%;width:${endPct - startPct}%"></div>`);
	}

	return `
		<div class="timeline-track ${trackIndex === selectedTrackIndex ? "selected" : ""}" data-track-row="${trackIndex}">
			${lineSegments.join("")}
			${keyframesHtml}
		</div>
	`;
}

function attachListeners(): void {
	if (!container) return;

	// کلیک روی ruler برای seek
	const ruler = container.querySelector<HTMLElement>(".timeline-ruler");
	ruler?.addEventListener("click", (e) => {
		if (!animation) return;
		const rect = ruler.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const pct = x / rect.width;
		const time = pct * animation.duration;
		callbacks?.onSeek(Math.max(0, Math.min(time, animation.duration)));
	});

	// کلیک روی track برای انتخاب یا seek
	const tracks = container.querySelectorAll<HTMLElement>("[data-track-row]");
	for (const track of tracks) {
		const trackIndex = parseInt(track.dataset.trackRow!);

		track.addEventListener("click", (e) => {
			if (!animation) return;
			const target = e.target as HTMLElement;
			if (target.classList.contains("timeline-keyframe")) return;

			// seek
			const rect = track.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const pct = x / rect.width;
			const time = pct * animation.duration;
			callbacks?.onSeek(Math.max(0, Math.min(time, animation.duration)));
			callbacks?.onTrackSelected(trackIndex);
		});
	}

	// کلیک روی label برای انتخاب
	const labels = container.querySelectorAll<HTMLElement>("[data-track-label]");
	for (const label of labels) {
		const trackIndex = parseInt(label.dataset.trackLabel!);
		label.addEventListener("click", () => {
			callbacks?.onTrackSelected(trackIndex);
		});
	}

	// کلیک روی keyframe
	const kfs = container.querySelectorAll<HTMLElement>(".timeline-keyframe");
	for (const kf of kfs) {
		const trackIndex = parseInt(kf.dataset.track!);
		const kfIndex = parseInt(kf.dataset.kf!);

		kf.addEventListener("click", (e) => {
			e.stopPropagation();
			callbacks?.onKeyframeSelected(trackIndex, kfIndex);
		});

		// drag keyframe
		let dragging = false;
		let startX = 0;
		let startTime = 0;
		let trackRect: DOMRect | null = null;

		kf.addEventListener("pointerdown", (e) => {
			e.stopPropagation();
			dragging = true;
			startX = e.clientX;
			if (!animation) return;
			const track = animation.tracks[trackIndex];
			const kfsSorted = [...track.keyframes].sort((a, b) => a.time - b.time);
			startTime = kfsSorted[kfIndex].time;

			const trackEl = kf.parentElement!;
			trackRect = trackEl.getBoundingClientRect();

			kf.setPointerCapture(e.pointerId);
		});

		kf.addEventListener("pointermove", (e) => {
			if (!dragging || !trackRect || !animation) return;
			const dx = e.clientX - startX;
			const pct = dx / trackRect.width;
			const newTime = Math.max(0, Math.min(animation.duration, startTime + pct * animation.duration));
			// live update
			kf.style.left = `${(newTime / animation.duration) * 100}%`;
		});

		kf.addEventListener("pointerup", (e) => {
			if (!dragging || !trackRect || !animation) return;
			dragging = false;
			kf.releasePointerCapture(e.pointerId);

			const dx = e.clientX - startX;
			const pct = dx / trackRect.width;
			const newTime = Math.max(0, Math.min(animation.duration, startTime + pct * animation.duration));

			callbacks?.onKeyframeMoved(trackIndex, kfIndex, Math.round(newTime));
		});
	}

	// دکمه‌ها
	const addTrackBtn = container.querySelector<HTMLButtonElement>('[data-action="add-track"]');
	addTrackBtn?.addEventListener("click", () => {
		callbacks?.onTrackAdded();
	});

	const removeBtns = container.querySelectorAll<HTMLButtonElement>("[data-remove-track]");
	for (const btn of removeBtns) {
		btn.addEventListener("click", (e) => {
			e.stopPropagation();
			const idx = parseInt(btn.dataset.removeTrack!);
			callbacks?.onTrackRemoved(idx);
		});
	}
}

function calculateTickStep(duration: number): number {
	const targetTicks = 10;
	const raw = duration / targetTicks;
	const pow = Math.pow(10, Math.floor(Math.log10(raw)));
	const candidates = [1, 2, 5, 10].map((m) => m * pow);
	for (const c of candidates) {
		if (c >= raw) return c;
	}
	return duration / targetTicks;
}

function formatTime(ms: number): string {
	if (ms < 1000) return `${Math.round(ms)}ms`;
	return `${(ms / 1000).toFixed(2)}s`;
}

function shortId(id: string): string {
	if (id.length <= 12) return id;
	return id.slice(0, 6) + "…" + id.slice(-4);
}

function escapeHtml(s: string): string {
	return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

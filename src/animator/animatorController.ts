import { log } from "../shared/logger.js";
import type { Animation, EasingType, Keyframe, Track } from "./animatorConfig.js";

// ============================================================
// Easing functions
// ============================================================

function easeLinear(t: number): number {
	return t;
}

function easeInQuad(t: number): number {
	return t * t;
}

function easeOutQuad(t: number): number {
	return 1 - (1 - t) * (1 - t);
}

function easeInOutQuad(t: number): number {
	return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function applyEasing(t: number, easing: EasingType): number {
	switch (easing) {
		case "linear":
			return easeLinear(t);
		case "easeIn":
			return easeInQuad(t);
		case "easeOut":
			return easeOutQuad(t);
		case "easeInOut":
			return easeInOutQuad(t);
		case "step":
			return t < 1 ? 0 : 1;
		default:
			return t;
	}
}

// ============================================================
// Keyframe sampling
// ============================================================

/**
 * مقدار یک track رو در زمان مشخص حساب می‌کنه.
 */
export function sampleTrack(track: Track, timeMs: number): number | string | boolean | null {
	const kfs = [...track.keyframes].sort((a, b) => a.time - b.time);
	if (kfs.length === 0) return null;
	if (kfs.length === 1) return kfs[0].value;

	// قبل از اولین کی‌فریم
	if (timeMs <= kfs[0].time) return kfs[0].value;

	// بعد از آخرین کی‌فریم
	if (timeMs >= kfs[kfs.length - 1].time) return kfs[kfs.length - 1].value;

	// بین دو کی‌فریم
	for (let i = 0; i < kfs.length - 1; i++) {
		const a = kfs[i];
		const b = kfs[i + 1];
		if (timeMs >= a.time && timeMs <= b.time) {
			// اگر مقدار غیرعددی باشه، پله‌ای
			if (typeof a.value !== "number" || typeof b.value !== "number") {
				return a.value;
			}
			const span = b.time - a.time;
			if (span === 0) return b.value;
			const localT = (timeMs - a.time) / span;
			const easedT = applyEasing(localT, a.easing);
			return a.value + (b.value - a.value) * easedT;
		}
	}
	return kfs[kfs.length - 1].value;
}

/**
 * یک snapshot از همه‌ی مقدارها در زمان مشخص برمی‌گردونه.
 * key = "objectId::property"
 */
export function sampleAnimation(animation: Animation, timeMs: number): Map<string, number | string | boolean> {
	const result = new Map<string, number | string | boolean>();
	for (const track of animation.tracks) {
		const value = sampleTrack(track, timeMs);
		if (value !== null) {
			result.set(`${track.objectId}::${track.property}`, value);
		}
	}
	return result;
}

// ============================================================
// Timeline controller (برای وب‌ویو)
// ============================================================

export interface PlaybackState {
	playing: boolean;
	currentTime: number;
	duration: number;
	loop: boolean;
}

export class AnimatorController {
	private animation: Animation;
	private state: PlaybackState;
	private rafId: number | null = null;
	private lastFrameTime = 0;
	private onChange: (state: PlaybackState) => void;

	constructor(animation: Animation, onChange: (state: PlaybackState) => void) {
		this.animation = animation;
		this.state = {
			playing: false,
			currentTime: 0,
			duration: animation.duration,
			loop: animation.loop,
		};
		this.onChange = onChange;
	}

	public getAnimation(): Animation {
		return this.animation;
	}

	public setAnimation(animation: Animation): void {
		this.animation = animation;
		this.state.duration = animation.duration;
		this.state.loop = animation.loop;
		this.onChange(this.state);
	}

	public getState(): PlaybackState {
		return { ...this.state };
	}

	public play(): void {
		if (this.state.playing) return;
		this.state.playing = true;
		this.lastFrameTime = performance.now();
		this.loop();
		this.onChange(this.state);
		log.debug("[Animator] play");
	}

	public pause(): void {
		if (!this.state.playing) return;
		this.state.playing = false;
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
		this.onChange(this.state);
		log.debug("[Animator] pause");
	}

	public stop(): void {
		this.pause();
		this.state.currentTime = 0;
		this.onChange(this.state);
		log.debug("[Animator] stop");
	}

	public seek(timeMs: number): void {
		this.state.currentTime = Math.max(0, Math.min(timeMs, this.state.duration));
		this.onChange(this.state);
	}

	public stepForward(): void {
		const step = 1000 / this.animation.fps;
		this.seek(this.state.currentTime + step);
	}

	public stepBackward(): void {
		const step = 1000 / this.animation.fps;
		this.seek(this.state.currentTime - step);
	}

	public jumpToEnd(): void {
		this.seek(this.state.duration);
	}

	public jumpToStart(): void {
		this.seek(0);
	}

	public dispose(): void {
		this.pause();
	}

	private loop = (): void => {
		if (!this.state.playing) return;

		const now = performance.now();
		const dt = now - this.lastFrameTime;
		this.lastFrameTime = now;

		this.state.currentTime += dt;

		if (this.state.currentTime >= this.state.duration) {
			if (this.state.loop) {
				this.state.currentTime = this.state.currentTime % this.state.duration;
			} else {
				this.state.currentTime = this.state.duration;
				this.state.playing = false;
				this.onChange(this.state);
				return;
			}
		}

		this.onChange(this.state);
		this.rafId = requestAnimationFrame(this.loop);
	};
}

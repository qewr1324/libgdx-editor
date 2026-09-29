import "./style.css";
import { animation, setAnimation, setCurrentTime, playing, setPlaying, currentTime, setSelectedTrackIndex, setSelectedKeyframeIndex, objects, selectedObjectId, setSelectedObjectId } from "./state.js";
import { setupMessages, setLoadCallback, setAnimationUpdateCallback, setSceneListCallback, postToExtension } from "./messages.js";
import { setupToolbar, rerenderToolbar, updateToolbarPlayButton } from "./ui/toolbar.js";
import { setupTimelinePanel, rerenderTimeline, updatePlayheadPosition } from "./ui/timeline-panel.js";
import { setupKeyframeInspector, rerenderKeyframeInspector } from "./ui/keyframe-inspector.js";
import { setupPreviewPanel, refreshPreview } from "./ui/preview-panel.js";
import { setupObjectPicker, rerenderObjectPicker } from "./ui/object-picker.js";
import { AnimatorController } from "../../animator/animatorController.js";
import type { EasingType, Track, AnimatableProperty } from "../../animator/animatorConfig.js";
import { ANIMATABLE_PROPERTIES } from "../../animator/animatorConfig.js";

const root = document.getElementById("animator-root")!;
let controller: AnimatorController | null = null;
let sceneList: Array<{ name: string; uri: string }> = [];

// برای اینکه بدونیم آخرین وضعیت playing چی بوده
let lastPlayingState = false;

// ============================================================
// Layout
// ============================================================

function buildLayout(): void {
	root.innerHTML = `
		<div class="animator-app">
			<div class="animator-topbar" id="animator-toolbar"></div>
			<div class="animator-main">
				<div class="animator-preview" id="animator-preview"></div>
				<div class="animator-right" id="animator-right"></div>
			</div>
			<div class="animator-bottom" id="animator-timeline"></div>
		</div>
	`;

	const rightPanel = document.getElementById("animator-right")!;
	rightPanel.innerHTML = `
		<div class="animator-right-section">
			<div class="animator-right-header">Object</div>
			<div id="animator-object-picker"></div>
		</div>
		<div class="animator-right-section">
			<div class="animator-right-header">Keyframe</div>
			<div id="animator-kf-inspector"></div>
		</div>
	`;
}

// ============================================================
// Boot
// ============================================================

(async () => {
	buildLayout();
	setupMessages();

	setLoadCallback(onLoad);
	setAnimationUpdateCallback(onAnimationUpdate);
	setSceneListCallback(onSceneList);

	const previewEl = document.getElementById("animator-preview")!;
	await setupPreviewPanel(previewEl);

	const toolbarEl = document.getElementById("animator-toolbar")!;
	setupToolbar(toolbarEl, {
		onPlay: () => controller?.play(),
		onPause: () => controller?.pause(),
		onStop: () => controller?.stop(),
		onStepForward: () => controller?.stepForward(),
		onStepBackward: () => controller?.stepBackward(),
		onJumpToStart: () => controller?.jumpToStart(),
		onJumpToEnd: () => controller?.jumpToEnd(),
		onToggleLoop: () => {},
		onMetadataChanged: (patch) => {
			postToExtension({ type: "updateMetadata", patch });
		},
		onSourceSceneChanged: (sceneName) => {
			postToExtension({ type: "changeSourceScene", sceneName });
		},
		onSave: () => {
			if (animation) {
				postToExtension({ type: "save", animation });
			}
		},
		onExportCode: () => {
			if (animation) {
				postToExtension({ type: "exportAnimationCode", animation });
			}
		},
	});

	const timelineEl = document.getElementById("animator-timeline")!;
	setupTimelinePanel(timelineEl, {
		onSeek: (time) => controller?.seek(time),
		onTrackSelected: (idx) => {
			setSelectedTrackIndex(idx);
			setSelectedKeyframeIndex(-1);
			rerenderTimeline();
			rerenderKeyframeInspector();
		},
		onKeyframeSelected: (trackIdx, kfIdx) => {
			setSelectedTrackIndex(trackIdx);
			setSelectedKeyframeIndex(kfIdx);
			rerenderTimeline();
			rerenderKeyframeInspector();
		},
		onKeyframeMoved: (trackIdx, kfIdx, newTime) => {
			handleKeyframeMoved(trackIdx, kfIdx, newTime);
		},
		onKeyframeAdded: (trackIdx, time) => {
			handleKeyframeAdded(trackIdx, time);
		},
		onKeyframeRemoved: (trackIdx, kfIdx) => {
			handleKeyframeRemoved(trackIdx, kfIdx);
		},
		onTrackAdded: () => {
			handleTrackAdded();
		},
		onTrackRemoved: (trackIdx) => {
			handleTrackRemoved(trackIdx);
		},
	});

	const kfEl = document.getElementById("animator-kf-inspector")!;
	setupKeyframeInspector(kfEl, {
		onKeyframeChanged: (trackIdx, kfIdx, patch) => {
			handleKeyframeChanged(trackIdx, kfIdx, patch);
		},
		onKeyframeDeleted: (trackIdx, kfIdx) => {
			handleKeyframeRemoved(trackIdx, kfIdx);
		},
	});

	const pickerEl = document.getElementById("animator-object-picker")!;
	setupObjectPicker(pickerEl, {
		onObjectSelected: (id) => {
			setSelectedObjectId(id);
			refreshPreview(currentTime);
		},
		onAddTrackForObject: (id) => {
			handleAddTrackForObject(id);
		},
	});

	postToExtension({ type: "ready" });
})();

// ============================================================
// Callbacks
// ============================================================

function onLoad(): void {
	if (controller) controller.dispose();
	if (!animation) return;
	controller = new AnimatorController(animation, onPlaybackUpdate);
	setCurrentTime(0);
	refreshPreview(0);
	rerenderToolbar();
	rerenderTimeline();
	rerenderKeyframeInspector();
	rerenderObjectPicker();
	updatePlayheadPosition(0);
	postToExtension({ type: "requestSceneList" });

	if (animation.sourceScene) {
		postToExtension({ type: "requestScene", sceneName: animation.sourceScene });
	}
}

function onAnimationUpdate(): void {
	if (controller && animation) {
		controller.setAnimation(animation);
	}
	refreshPreview(currentTime);
	rerenderToolbar();
	rerenderTimeline();
	rerenderKeyframeInspector();
	rerenderObjectPicker();
}

function onSceneList(scenes: Array<{ name: string; uri: string }>): void {
	sceneList = scenes;
}

function onPlaybackUpdate(state: { playing: boolean; currentTime: number }): void {
	const playingChanged = state.playing !== lastPlayingState;
	lastPlayingState = state.playing;

	setPlaying(state.playing);
	setCurrentTime(state.currentTime);

	updatePlayheadPosition(state.currentTime);
	refreshPreview(state.currentTime);

	if (playingChanged) {
		rerenderToolbar();
	} else {
		updateToolbarPlayButton(state.playing);
	}
}

// ============================================================
// Auto-select اولین آبجکت وقتی صحنه لود می‌شه
// ============================================================

export function onSceneLoadedAutoSelect(): void {
	if (objects.length === 0) return;

	// اگه قبلاً آبجکتی انتخاب شده، همون رو نگه دار
	if (selectedObjectId && objects.some((o) => o.id === selectedObjectId)) {
		rerenderObjectPicker();
		return;
	}

	// ✅ اولین آبجکت رو انتخاب کن
	const first = objects[0];
	setSelectedObjectId(first.id);

	// ✅ اگه هیچ track ای برای این آبجکت نیست، یکی بساز
	if (animation && !animation.tracks.some((t) => t.objectId === first.id)) {
		handleAddTrackForObject(first.id);
	}

	rerenderObjectPicker();
}

// ============================================================
// Track operations
// ============================================================

/**
 * ✅ اضافه کردن track برای یک آبجکت مشخص
 */
function handleAddTrackForObject(objectId: string): void {
	if (!animation) return;

	// اگه track برای این آبجکت هست، فقط انتخابش کن
	const existingIdx = animation.tracks.findIndex((t) => t.objectId === objectId);
	if (existingIdx !== -1) {
		setSelectedTrackIndex(existingIdx);
		setSelectedKeyframeIndex(-1);
		rerenderTimeline();
		rerenderKeyframeInspector();
		return;
	}

	// property پیش‌فرض: transform.x
	const property: AnimatableProperty = "transform.x";

	const newTrack: Track = {
		objectId,
		property,
		keyframes: [
			{ time: 0, value: 0, easing: "linear" },
			{ time: animation.duration, value: 0, easing: "linear" },
		],
	};

	const tracks = [...animation.tracks, newTrack];
	setAnimation({ ...animation, tracks });
	postToExtension({ type: "updateAnimation", animation, historyLabel: "add track" });

	// انتخاب track جدید
	const newIdx = tracks.length - 1;
	setSelectedTrackIndex(newIdx);
	setSelectedKeyframeIndex(-1);

	rerenderTimeline();
	rerenderKeyframeInspector();
}

// ============================================================
// Keyframe operations
// ============================================================

function handleKeyframeMoved(trackIndex: number, kfIndex: number, newTime: number): void {
	if (!animation) return;
	const tracks = animation.tracks.map((t) => ({ ...t, keyframes: [...t.keyframes] }));
	const track = tracks[trackIndex];
	if (!track) return;
	const sorted = [...track.keyframes].sort((a, b) => a.time - b.time);
	if (!sorted[kfIndex]) return;
	sorted[kfIndex] = { ...sorted[kfIndex], time: newTime };
	track.keyframes = sorted;
	setAnimation({ ...animation, tracks });
	postToExtension({ type: "updateAnimation", animation, historyLabel: "move keyframe" });
	rerenderTimeline();
}

function handleKeyframeAdded(trackIndex: number, time: number): void {
	if (!animation) return;
	const tracks = animation.tracks.map((t) => ({ ...t, keyframes: [...t.keyframes] }));
	const track = tracks[trackIndex];
	if (!track) return;
	track.keyframes.push({ time, value: 0, easing: "linear" });
	setAnimation({ ...animation, tracks });
	postToExtension({ type: "updateAnimation", animation, historyLabel: "add keyframe" });
	rerenderTimeline();
}

function handleKeyframeRemoved(trackIndex: number, kfIndex: number): void {
	if (!animation) return;
	const tracks = animation.tracks.map((t) => ({ ...t, keyframes: [...t.keyframes] }));
	const track = tracks[trackIndex];
	if (!track) return;
	const sorted = [...track.keyframes].sort((a, b) => a.time - b.time);
	sorted.splice(kfIndex, 1);
	track.keyframes = sorted;
	setAnimation({ ...animation, tracks });
	postToExtension({ type: "updateAnimation", animation, historyLabel: "delete keyframe" });
	setSelectedKeyframeIndex(-1);
	rerenderTimeline();
	rerenderKeyframeInspector();
}

function handleKeyframeChanged(trackIndex: number, kfIndex: number, patch: { time?: number; value?: number | string; easing?: EasingType }): void {
	if (!animation) return;
	const tracks = animation.tracks.map((t) => ({ ...t, keyframes: [...t.keyframes] }));
	const track = tracks[trackIndex];
	if (!track) return;
	const sorted = [...track.keyframes].sort((a, b) => a.time - b.time);
	if (!sorted[kfIndex]) return;
	sorted[kfIndex] = { ...sorted[kfIndex], ...patch };
	track.keyframes = sorted;
	setAnimation({ ...animation, tracks });
	postToExtension({ type: "updateAnimation", animation, historyLabel: "edit keyframe" });
	rerenderTimeline();
	rerenderKeyframeInspector();
}

function handleTrackAdded(): void {
	if (!animation) return;
	if (objects.length === 0) {
		alert("No objects available. Load a scene first.");
		return;
	}

	// اگه آبجکتی انتخاب شده، از اون استفاده کن؛ وگرنه اولین آبجکت
	const targetId = selectedObjectId ?? objects[0].id;
	handleAddTrackForObject(targetId);
}

function handleTrackRemoved(trackIndex: number): void {
	if (!animation) return;
	const tracks = animation.tracks.filter((_, i) => i !== trackIndex);
	setAnimation({ ...animation, tracks });
	postToExtension({ type: "updateAnimation", animation, historyLabel: "remove track" });
	setSelectedTrackIndex(-1);
	setSelectedKeyframeIndex(-1);
	rerenderTimeline();
	rerenderKeyframeInspector();
}

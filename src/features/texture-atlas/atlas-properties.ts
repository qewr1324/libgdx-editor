// src/features/texture-atlas/atlas-properties.ts
import type { GameObject } from "../../types/scene.js";
import type { AtlasData, AtlasRegion } from "./atlas-types.js";

// ============================================================
// Types
// ============================================================

export type AtlasMode = "single" | "sequence" | "grid";

export interface AtlasProperties {
	/** مسیر atlas.png (نسبی به صحنه) */
	texture: string;
	/** مسیر atlas.atlas (اگه فایل داشته باشه) — ممکنه خالی باشه */
	atlasPath: string;
	/** رنگ tint (hex) */
	tint: string;

	/** حالت انتخاب region */
	mode: AtlasMode;

	// ---------- single ----------
	/** نام region انتخاب‌شده (mode === "single") */
	region?: string;

	// ---------- sequence ----------
	/** لیست region ها برای انیمیشن (mode === "sequence") */
	frames?: string[];
	/** فریم بر ثانیه (mode === "sequence") */
	fps?: number;
	/** لوپ (mode === "sequence") */
	loop?: boolean;

	// ---------- grid ----------
	/** تعداد ستون (mode === "grid") */
	gridCols?: number;
	/** تعداد ردیف (mode === "grid") */
	gridRows?: number;
	/** فاصله افقی بین cell ها (mode === "grid") */
	cellOffsetX?: number;
	/** فاصله عمودی بین cell ها (mode === "grid") */
	cellOffsetY?: number;
	/** از کدوم region شروع بشه (mode === "grid", پیش‌فرض 0) */
	startIndex?: number;
}

// ============================================================
// Defaults
// ============================================================

export const DEFAULT_ATLAS_PROPERTIES: AtlasProperties = {
	texture: "",
	atlasPath: "",
	tint: "#ffffff",
	mode: "single",
	region: undefined,
	frames: [],
	fps: 8,
	loop: true,
	gridCols: 1,
	gridRows: 1,
	cellOffsetX: 0,
	cellOffsetY: 0,
	startIndex: 0,
};

// ============================================================
// Read / Write on GameObject.properties.atlas
// ============================================================

/**
 * چک می‌کنه آیا این آبجکت تنظیمات atlas داره یا نه.
 * فقط وجود کلید `atlas` توی `properties` کافیه.
 */
export function hasAtlas(obj: GameObject | null | undefined): boolean {
	if (!obj) return false;
	const raw = obj.properties?.atlas;
	return raw !== undefined && raw !== null && typeof raw === "object";
}

/**
 * تنظیمات atlas آبجکت رو می‌خونه (با defaults).
 * اگه نداشت، `null` برمی‌گردونه — چون وجودش معنادار نیست.
 */
export function getAtlasProperties(obj: GameObject | null | undefined): AtlasProperties | null {
	if (!obj) return null;
	const raw = obj.properties?.atlas as Partial<AtlasProperties> | undefined;
	if (!raw) return null;
	return normalizeAtlasProperties(raw);
}

/**
 * تنظیمات atlas رو ست می‌کنه.
 * اگه props نال باشه، کلید atlas پاک می‌شه.
 */
export function setAtlasProperties(obj: GameObject, props: AtlasProperties | null): void {
	if (!obj.properties) obj.properties = {};
	if (props === null) {
		delete obj.properties.atlas;
		return;
	}
	obj.properties.atlas = normalizeAtlasProperties(props);
}

/**
 * تنظیمات رو با default ها merge می‌کنه و تایپ‌ها رو درست می‌کنه.
 */
export function normalizeAtlasProperties(raw: Partial<AtlasProperties>): AtlasProperties {
	const mode: AtlasMode = raw.mode === "sequence" || raw.mode === "grid" ? raw.mode : "single";

	const normalized: AtlasProperties = {
		texture: typeof raw.texture === "string" ? raw.texture : "",
		atlasPath: typeof raw.atlasPath === "string" ? raw.atlasPath : "",
		tint: typeof raw.tint === "string" && raw.tint.trim() ? raw.tint : "#ffffff",
		mode,
	};

	if (mode === "single") {
		normalized.region = typeof raw.region === "string" ? raw.region : undefined;
	} else if (mode === "sequence") {
		normalized.frames = Array.isArray(raw.frames) ? raw.frames.filter((f): f is string => typeof f === "string") : [];
		normalized.fps = typeof raw.fps === "number" && raw.fps > 0 ? raw.fps : 8;
		normalized.loop = typeof raw.loop === "boolean" ? raw.loop : true;
	} else if (mode === "grid") {
		normalized.gridCols = typeof raw.gridCols === "number" && raw.gridCols > 0 ? Math.floor(raw.gridCols) : 1;
		normalized.gridRows = typeof raw.gridRows === "number" && raw.gridRows > 0 ? Math.floor(raw.gridRows) : 1;
		normalized.cellOffsetX = typeof raw.cellOffsetX === "number" ? raw.cellOffsetX : 0;
		normalized.cellOffsetY = typeof raw.cellOffsetY === "number" ? raw.cellOffsetY : 0;
		normalized.startIndex = typeof raw.startIndex === "number" && raw.startIndex >= 0 ? Math.floor(raw.startIndex) : 0;
	}

	return normalized;
}

// ============================================================
// Validation
// ============================================================

export interface AtlasValidationResult {
	ok: boolean;
	errors: string[];
	warnings: string[];
}

/**
 * تنظیمات atlas رو نسبت به داده‌ی واقعی atlas بررسی می‌کنه.
 * مثلاً: اگه mode=single ولی region انتخاب نشده، error.
 */
export function validateAtlasProperties(props: AtlasProperties, atlas: AtlasData | null): AtlasValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (!props.texture) {
		errors.push("Texture path is empty.");
	}

	switch (props.mode) {
		case "single": {
			if (!props.region) {
				errors.push("Single mode requires a region name.");
			} else if (atlas && !atlas.regions.some((r) => r.name === props.region)) {
				warnings.push(`Region "${props.region}" not found in atlas.`);
			}
			break;
		}
		case "sequence": {
			if (!props.frames || props.frames.length === 0) {
				errors.push("Sequence mode requires at least one frame.");
			} else if (atlas) {
				const missing = props.frames.filter((f) => !atlas.regions.some((r) => r.name === f));
				if (missing.length > 0) {
					warnings.push(`${missing.length} frame(s) not found in atlas.`);
				}
			}
			if (typeof props.fps !== "number" || props.fps <= 0) {
				errors.push("Sequence FPS must be > 0.");
			}
			break;
		}
		case "grid": {
			const cols = props.gridCols ?? 1;
			const rows = props.gridRows ?? 1;
			if (cols < 1 || rows < 1) {
				errors.push("Grid cols and rows must be >= 1.");
			}
			if (atlas) {
				const total = cols * rows;
				const start = props.startIndex ?? 0;
				const available = atlas.regions.length - start;
				if (available < total) {
					warnings.push(`Grid needs ${total} regions but only ${Math.max(available, 0)} available from index ${start}.`);
				}
			}
			break;
		}
	}

	return {
		ok: errors.length === 0,
		errors,
		warnings,
	};
}

// ============================================================
// Helpers
// ============================================================

/**
 * لیست region هایی که این atlas props بهشون اشاره می‌کنه.
 * برای preview یا محاسبه‌ی frame count.
 */
export function resolveAtlasRegions(props: AtlasProperties, atlas: AtlasData | null): AtlasRegion[] {
	if (!atlas) return [];

	switch (props.mode) {
		case "single": {
			if (!props.region) return [];
			const r = atlas.regions.find((x) => x.name === props.region);
			return r ? [r] : [];
		}
		case "sequence": {
			if (!props.frames || props.frames.length === 0) return [];
			return props.frames.map((name) => atlas.regions.find((r) => r.name === name)).filter((r): r is AtlasRegion => !!r);
		}
		case "grid": {
			const cols = props.gridCols ?? 1;
			const rows = props.gridRows ?? 1;
			const start = props.startIndex ?? 0;
			return atlas.regions.slice(start, start + cols * rows);
		}
	}
}

/**
 * می‌گه این props آیا به یه atlas معتبر وصل هست یا نه (فقط برای UI hint).
 */
export function isAtlasReady(props: AtlasProperties, atlas: AtlasData | null): boolean {
	if (!props.texture) return false;
	const v = validateAtlasProperties(props, atlas);
	return v.ok;
}

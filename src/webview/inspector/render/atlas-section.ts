// src/webview/inspector/render/atlas-section.ts
import type { GameObject } from "../../../types/scene.js";
import type { AtlasProperties, AtlasMode } from "../../../features/texture-atlas/atlas-properties.js";
import { resolveFrameRects, countFrames } from "../../../features/texture-atlas/atlas-grid.js";
import { sectionWrap, field, fieldRow, numberField, subHeader } from "./section-helpers.js";
import { escapeAttr, escapeHtml } from "../utils.js";

// ============================================================
// Types
// ============================================================

export interface AtlasInspectorContext {
	regions: Array<{ name: string; x: number; y: number; width: number; height: number; rotate: boolean; index: number }>;
	atlasPath: string;
	loading: boolean;
	notFound: boolean;
	textureWidth: number;
	textureHeight: number;
	textureDataUrl: string | null;
}

// ============================================================
// Build
// ============================================================

export function buildAtlasSection(props: AtlasProperties, obj: GameObject, ctx: AtlasInspectorContext): string {
	const modeOptions: Array<{ value: AtlasMode; label: string; icon: string }> = [
		{ value: "single", label: "Single Region", icon: "🖼️" },
		{ value: "grid", label: "Grid", icon: "⊞" },
	];

	const modeSelect = `
		<select data-atlas-field="mode">
			${modeOptions.map((m) => `<option value="${m.value}" ${props.mode === m.value ? "selected" : ""}>${m.icon} ${escapeHtml(m.label)}</option>`).join("")}
		</select>
	`;

	const modeBody = buildModeBody(props, ctx);
	const frameCount = countFrames(props, ctx.regions.length > 0 ? ({ regions: ctx.regions } as never) : null);

	return sectionWrap(
		"atlas",
		"🗺️ Atlas",
		`
			${buildInfoRow("Texture", props.texture || "(none)")}
			${buildInfoRow("Atlas file", props.atlasPath || "(none — pixel grid only)")}
			${buildInfoRow("Regions", ctx.loading ? "(loading…)" : ctx.notFound ? "(no .atlas file)" : `${ctx.regions.length} found`)}

			${subHeader("Mode")}
			${field("Type", modeSelect)}

			${modeBody}

			${subHeader("Tint")}
			<div class="inspector-color-row">
				<input type="color" data-atlas-field="tint" value="${escapeAttr(props.tint)}" />
				<input type="text" data-atlas-field="tint" value="${escapeAttr(props.tint)}" />
			</div>

			${subHeader("Preview")}
			${buildPreviewHtml(props, ctx, frameCount)}

			<div class="inspector-atlas-footer" data-atlas-footer>
				<button class="inspector-atlas-btn danger" data-atlas-action="remove" title="Remove atlas settings">
					🗑️ Remove Atlas
				</button>
			</div>
		`,
	);
}

// ============================================================
// Info rows
// ============================================================

function buildInfoRow(label: string, value: string): string {
	return `
		<div class="inspector-readonly-field">
			<span class="inspector-readonly-label">${escapeHtml(label)}</span>
			<span class="inspector-readonly-value">${escapeHtml(value)}</span>
		</div>
	`;
}

// ============================================================
// Mode-specific bodies
// ============================================================

function buildModeBody(props: AtlasProperties, ctx: AtlasInspectorContext): string {
	switch (props.mode) {
		case "single":
			return buildSingleBody(props, ctx);
		case "grid":
			return buildGridBody(props, ctx);
	}
}

function buildSingleBody(props: AtlasProperties, ctx: AtlasInspectorContext): string {
	const regionOptions = ctx.regions.map((r) => `<option value="${escapeAttr(r.name)}" ${props.region === r.name ? "selected" : ""}>${escapeHtml(r.name)}</option>`).join("");

	const emptyHint = ctx.regions.length === 0 ? `<div class="inspector-hint">No regions loaded. Provide a .atlas file or switch to Grid mode.</div>` : "";

	return `
		${subHeader("Region")}
		<div class="inspector-field">
			<label class="inspector-field-label">Region</label>
			<div class="inspector-field-input">
				<select data-atlas-field="region" ${ctx.regions.length === 0 ? "disabled" : ""}>
					<option value="">— select —</option>
					${regionOptions}
				</select>
			</div>
		</div>
		${emptyHint}
	`;
}

function buildGridBody(props: AtlasProperties, ctx: AtlasInspectorContext): string {
	const hasAtlas = ctx.regions.length > 0;
	const totalRegions = ctx.regions.length;
	const cols = props.gridCols ?? 1;
	const rows = props.gridRows ?? 1;
	const start = props.startIndex ?? 0;
	const totalNeeded = cols * rows;
	const available = Math.max(0, totalRegions - start);

	const info = hasAtlas ? `<div class="inspector-hint">Atlas has ${totalRegions} regions. Grid needs ${totalNeeded} (${available} available from index ${start}).</div>` : `<div class="inspector-hint">No atlas — pixel grid will be computed from image size.</div>`;

	const warning = hasAtlas && available < totalNeeded ? `<div class="inspector-hint" style="color:#ffaa44;">⚠️ Not enough regions. Increase start index or reduce grid size.</div>` : "";

	return `
		${subHeader("Grid Size")}
		${fieldRow(numberField("Cols", "atlas.gridCols", cols, { step: 1, min: 1 }), numberField("Rows", "atlas.gridRows", rows, { step: 1, min: 1 }))}

		${subHeader("Offset (px, between cells)")}
		${fieldRow(numberField("X", "atlas.cellOffsetX", props.cellOffsetX ?? 0, { step: 1 }), numberField("Y", "atlas.cellOffsetY", props.cellOffsetY ?? 0, { step: 1 }))}

		${subHeader("Start Index")}
		${numberField("Start", "atlas.startIndex", start, { step: 1, min: 0 })}

		${info}
		${warning}
	`;
}

// ============================================================
// Preview
// ============================================================

function buildPreviewHtml(props: AtlasProperties, ctx: AtlasInspectorContext, frameCount: number): string {
	if (frameCount === 0) {
		return `<div class="inspector-hint">No frames to preview.</div>`;
	}

	if (!ctx.textureDataUrl) {
		return `<div class="inspector-hint">Texture not loaded yet.</div>`;
	}

	const rects = resolveFrameRects(props, null, ctx.textureWidth, ctx.textureHeight);
	if (rects.length === 0) {
		return `<div class="inspector-hint">No frames to preview.</div>`;
	}

	const previewRects = rects.slice(0, 8);
	const moreCount = rects.length - previewRects.length;

	const cells = previewRects.map((r) => buildPreviewCell(r, ctx)).join("");
	const moreHint = moreCount > 0 ? `<div class="atlas-preview-more">+${moreCount} more</div>` : "";

	return `
		<div class="atlas-preview-grid" data-atlas-preview-grid>
			${cells}
			${moreHint}
		</div>
		<div class="atlas-preview-meta">
			<span>${frameCount} frame${frameCount === 1 ? "" : "s"}</span>
			${rects[0] ? `<span class="atlas-preview-dims">${rects[0].width}×${rects[0].height}</span>` : ""}
		</div>
	`;
}

function buildPreviewCell(rect: { name: string; x: number; y: number; width: number; height: number; rotate: boolean }, ctx: AtlasInspectorContext): string {
	if (!ctx.textureDataUrl) return "";

	const texW = ctx.textureWidth || 1;
	const texH = ctx.textureHeight || 1;
	const cssY = texH - (rect.y + rect.height);

	const maxCell = 40;
	const scale = Math.min(maxCell / rect.width, maxCell / rect.height, 1);
	const displayW = Math.round(rect.width * scale);
	const displayH = Math.round(rect.height * scale);

	const bgSizeW = texW;
	const bgSizeH = texH;

	const bgPosX = -rect.x;
	const bgPosY = -cssY;

	return `
		<div class="atlas-preview-cell" title="${escapeAttr(rect.name)}" style="
			width: ${displayW}px;
			height: ${displayH}px;
			background-image: url('${ctx.textureDataUrl}');
			background-size: ${bgSizeW}px ${bgSizeH}px;
			background-position: ${bgPosX}px ${bgPosY}px;
			background-repeat: no-repeat;
		"></div>
	`;
}

// ============================================================
// Utility
// ============================================================

export function emptyAtlasContext(): AtlasInspectorContext {
	return {
		regions: [],
		atlasPath: "",
		loading: false,
		notFound: false,
		textureWidth: 0,
		textureHeight: 0,
		textureDataUrl: null,
	};
}

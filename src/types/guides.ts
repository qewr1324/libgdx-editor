// src/types/guides.ts

export type GuideAxis = "horizontal" | "vertical";

export interface Guide {
	/** شناسه یکتا */
	id: string;
	/** جهت: horizontal (افقی) یا vertical (عمودی) */
	axis: GuideAxis;
	/** موقعیت توی world coordinates */
	position: number;
	/** اگه true، نمی‌شه drag کرد */
	locked?: boolean;
	/** رنگ hex (اختیاری، پیش‌فرض از theme) */
	color?: string;
}

export const DEFAULT_GUIDE_COLOR = "#00b8d4";

// ============================================================
// Factory
// ============================================================

export function createGuideId(): string {
	return `guide_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createGuide(axis: GuideAxis, position: number, color?: string): Guide {
	return {
		id: createGuideId(),
		axis,
		position: Math.round(position),
		locked: false,
		color,
	};
}

// ============================================================
// Helpers
// ============================================================

export function isHorizontal(guide: Guide): boolean {
	return guide.axis === "horizontal";
}

export function isVertical(guide: Guide): boolean {
	return guide.axis === "vertical";
}

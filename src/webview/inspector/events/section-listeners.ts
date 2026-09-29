// src/webview/inspector/events/section-listeners.ts
import { collapsedSections } from "../state.js";
import { app } from "../vscode-api.js";

/**
 * listener های مربوط به toggle/expand کردن section ها
 * و دکمه‌های reset هر section.
 */
export function attachSectionListeners(): void {
	// ---------- Toggle section headers ----------
	const headers = app.querySelectorAll<HTMLDivElement>("[data-section-toggle]");
	for (const header of headers) {
		header.addEventListener("click", (e) => {
			// اگه روی دکمه‌ی reset کلیک شده، toggle نکن
			if ((e.target as HTMLElement).closest("[data-section-reset]")) return;

			const id = header.dataset.sectionToggle!;
			if (collapsedSections.has(id)) {
				collapsedSections.delete(id);
			} else {
				collapsedSections.add(id);
			}

			// رندر مجدد (با import داینامیک تا circular dependency نشه)
			void import("../render/index.js").then((m) => m.render(true));
		});
	}

	// ---------- Section reset buttons ----------
	const resetButtons = app.querySelectorAll<HTMLButtonElement>("[data-section-reset]");
	for (const btn of resetButtons) {
		btn.addEventListener("click", (e) => {
			// فقط جلوی toggle رو بگیر، فعلاً کار دیگه‌ای نکن
			e.stopPropagation();
		});
	}
}

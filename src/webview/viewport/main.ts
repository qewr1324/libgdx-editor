import "./style-init.js";
import { initPixi } from "./pixi/setup.js";
import { setupToolbar } from "./ui/toolbar.js";
import { setupContextMenu } from "./ui/context-menu.js";
import { setupRulers } from "./ui/rulers.js";
import { setupMouseTracker } from "./ui/mouse-tracker.js";
import { setupDeselect } from "./selection/selection.js";
import { setupMessages } from "./messages.js";
import { vscode } from "./types.js";
import { applyTheme } from "./theme/theme-manager.js";
import { DEFAULT_THEME } from "./theme/themes.js";

(async () => {
	// تم پیش‌فرض قبل از هر چیز اعمال شود
	applyTheme(DEFAULT_THEME);

	await initPixi();
	setupToolbar();
	setupContextMenu();
	setupRulers();
	setupMouseTracker();
	setupDeselect();
	setupMessages();
	vscode.postMessage({ type: "ready" });
})();

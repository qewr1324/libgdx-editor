// src/webview/viewport/main.ts
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
import { installSnapping } from "./features/snapping/index.js";

(async () => {
	applyTheme(DEFAULT_THEME);
	installSnapping();

	await initPixi();
	setupToolbar();
	setupContextMenu();
	setupRulers();
	setupMouseTracker();
	setupDeselect();
	setupMessages();
	vscode.postMessage({ type: "ready" });
})();

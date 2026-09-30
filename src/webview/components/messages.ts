// src/webview/components/messages.ts
import type { GameObject } from "../../types/scene.js";
import type { LibGdxEditorConfigMessage } from "../../protocol/messages.js";
import { vscode } from "./vscode-api.js";
import { setCurrentObject, setCurrentConfig, setMultiSelection, setAtlasRegions, clearAtlasPending } from "./state.js";
import type { AtlasRegionInfo } from "./types.js";
import { render } from "./render.js";

export function setupMessages(): void {
	window.addEventListener("message", (event) => {
		const msg = event.data;
		switch (msg.type) {
			case "showObject":
				setMultiSelection(null);
				setCurrentObject(msg.object as GameObject);
				render(false);
				break;

			case "showMultiSelection":
				setMultiSelection({ count: msg.count, ids: msg.ids });
				render(true);
				break;

			case "clearSelection":
				setMultiSelection(null);
				setCurrentObject(null);
				render(true);
				break;

			case "configLoaded":
			case "configUpdated":
				setCurrentConfig(msg.config as LibGdxEditorConfigMessage);
				void import("./theme.js").then((m) => m.applyEffectiveTheme());
				break;

			case "atlasRegionsLoaded": {
				const texturePath = msg.texturePath as string;
				const regions = msg.regions as AtlasRegionInfo[];
				setAtlasRegions(texturePath, regions);
				render(false);
				break;
			}

			case "atlasNotFound": {
				const texturePath = msg.texturePath as string;
				clearAtlasPending(texturePath);
				break;
			}
		}
	});

	vscode.postMessage({ type: "requestConfig" });
}

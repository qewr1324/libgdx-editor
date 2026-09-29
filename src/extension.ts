import * as vscode from "vscode";
import { SceneEditorProvider } from "./editor/SceneEditorProvider.js";
import { InspectorProvider } from "./views/InspectorProvider.js";
import { newSceneCommand } from "./commands/newScene.js";
import { importTextureCommand, cleanupAssetsCommand } from "./commands/importTexture.js";
import { generateCodeCommand } from "./commands/generateCode.js";
import { ConfigManager } from "./config/config-manager.js";
import { SceneRegistry } from "./editor/scene-registry.js";
import { updateObjectOp, deleteObjectOp, focusObjectOp, updateSceneFieldOp } from "./editor/scene-ops.js";
import { setObjectZIndexInScene, bringForwardInScene, sendBackwardInScene, bringToFrontInScene, sendToBackInScene } from "./editor/scene-mutations.js";
import { setDebugEnabled, log } from "./shared/logger.js";
import { AnimatorEditorProvider } from "./animator/AnimatorEditorProvider.js";
import { openAnimatorCommand } from "./animator/commands/openAnimator.js";
import { createAnimationCommand } from "./animator/commands/createAnimation.js";

export async function activate(context: vscode.ExtensionContext) {
	if (context.extensionMode === vscode.ExtensionMode.Development) {
		setDebugEnabled(true);
	}

	log.debug("LibGDX Editor activated");

	const configManager = ConfigManager.getInstance();
	await configManager.load();

	const inspector = new InspectorProvider(context.extensionUri);

	context.subscriptions.push(vscode.window.registerWebviewViewProvider(InspectorProvider.viewType, inspector, { webviewOptions: { retainContextWhenHidden: true } }), SceneEditorProvider.register(context), AnimatorEditorProvider.register(context));

	context.subscriptions.push(
		SceneEditorProvider.onDidSelectObject((host, objectIds, scene) => {
			inspector.setSelection(host, objectIds, scene);
		}),
	);

	context.subscriptions.push(
		SceneEditorProvider.onDidChangeScene((host, scene) => {
			inspector.setScene(host, scene);
		}),
	);

	context.subscriptions.push(
		SceneEditorProvider.onDidRequestSceneSettings((host, scene) => {
			inspector.showSceneSettings(host, scene);
			void vscode.commands.executeCommand("libgdx-editor.inspector.focus");
		}),
	);

	context.subscriptions.push(
		SceneRegistry.onDidChangeActiveInstance((instance) => {
			if (!instance) return;
			const scene = instance.getScene();
			if (scene) {
				inspector.setScene(instance, scene);
			}
		}),
	);

	context.subscriptions.push(
		configManager.onChange((config) => {
			SceneEditorProvider.broadcastConfigChange(config);
			inspector.broadcastConfigChange(config);
		}),
	);

	inspector.setHandlers({
		onUpdateObject: (host, obj, historyLabel) => updateObjectOp(host, obj, historyLabel ?? "inspector edit"),
		onDeleteObject: (host, objectId) => deleteObjectOp(host, objectId),
		onFocusObject: (host, objectId) => focusObjectOp(host, objectId),
		onUpdateSceneField: (host, field, value, historyLabel) => updateSceneFieldOp(host, field, value, historyLabel ?? `scene: ${field}`),
		onSetObjectZIndex: (host, objectId, zIndex) => {
			const scene = host.getScene();
			if (!scene) return;
			const updated = setObjectZIndexInScene(scene, objectId, zIndex);
			host.getHistory().commit(updated, "set z-index");
		},
		onBringForward: (host, objectId) => {
			const scene = host.getScene();
			if (!scene) return;
			const updated = bringForwardInScene(scene, objectId);
			if (updated !== scene) host.getHistory().commit(updated, "bring forward");
		},
		onSendBackward: (host, objectId) => {
			const scene = host.getScene();
			if (!scene) return;
			const updated = sendBackwardInScene(scene, objectId);
			if (updated !== scene) host.getHistory().commit(updated, "send backward");
		},
		onBringToFront: (host, objectId) => {
			const scene = host.getScene();
			if (!scene) return;
			const updated = bringToFrontInScene(scene, objectId);
			host.getHistory().commit(updated, "bring to front");
		},
		onSendToBack: (host, objectId) => {
			const scene = host.getScene();
			if (!scene) return;
			const updated = sendToBackInScene(scene, objectId);
			host.getHistory().commit(updated, "send to back");
		},
	});

	context.subscriptions.push(
		vscode.commands.registerCommand("libgdx-editor.newScene", (uri?: vscode.Uri) => newSceneCommand(context, uri)),
		vscode.commands.registerCommand("libgdx-editor.openEditor", async () => {
			const uri = await vscode.window.showOpenDialog({
				canSelectMany: false,
				filters: { "LibGDX Scene": ["json"] },
				title: "Open LibGDX Scene",
			});
			if (uri && uri[0]) {
				await vscode.commands.executeCommand("vscode.openWith", uri[0], SceneEditorProvider.viewType);
			}
		}),
		vscode.commands.registerCommand("libgdx-editor.importTexture", (uri?: vscode.Uri) => importTextureCommand(context, uri)),
		vscode.commands.registerCommand("libgdx-editor.cleanupAssets", () => cleanupAssetsCommand()),
		vscode.commands.registerCommand("libgdx-editor.generateCode", () => generateCodeCommand()),
		// Animator
		vscode.commands.registerCommand("libgdx-editor.openAnimator", (uri?: vscode.Uri) => openAnimatorCommand(uri)),
		vscode.commands.registerCommand("libgdx-editor.createAnimation", (uri?: vscode.Uri) => createAnimationCommand(uri)),
	);
}

export function deactivate() {}

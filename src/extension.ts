import * as vscode from "vscode";
import { SceneEditorProvider } from "./editor/SceneEditorProvider.js";
import { InspectorProvider } from "./views/InspectorProvider.js";
import { newSceneCommand } from "./commands/newScene.js";
import { importTextureCommand, cleanupAssetsCommand } from "./commands/importTexture.js";
import { ConfigManager } from "./config/config-manager.js";
import { SceneRegistry } from "./editor/scene-registry.js";
import { updateObjectOp, deleteObjectOp, focusObjectOp, updateSceneFieldOp } from "./editor/scene-ops.js";
import { setDebugEnabled, log } from "./shared/logger.js";

export async function activate(context: vscode.ExtensionContext) {
	if (context.extensionMode === vscode.ExtensionMode.Development) {
		setDebugEnabled(true);
	}

	log.debug("LibGDX Editor activated");

	const configManager = ConfigManager.getInstance();
	await configManager.load();

	const inspector = new InspectorProvider(context.extensionUri);

	context.subscriptions.push(vscode.window.registerWebviewViewProvider(InspectorProvider.viewType, inspector, { webviewOptions: { retainContextWhenHidden: true } }), SceneEditorProvider.register(context));

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
	);
}

export function deactivate() {}

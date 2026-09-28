import * as vscode from "vscode";
import { SceneEditorProvider } from "./editor/SceneEditorProvider.js";
import { InspectorProvider } from "./views/InspectorProvider.js";
import { newSceneCommand } from "./commands/newScene.js";
import { importTextureCommand, cleanupAssetsCommand } from "./commands/importTexture.js";
import { ConfigManager } from "./config/config-manager.js";
import { SceneRegistry } from "./editor/scene-registry.js";

export async function activate(context: vscode.ExtensionContext) {
	console.log("LibGDX Editor activated");

	const configManager = ConfigManager.getInstance();
	await configManager.load();
	console.log("LibGDX Editor config loaded:", configManager.get());

	const inspector = new InspectorProvider(context.extensionUri);

	context.subscriptions.push(vscode.window.registerWebviewViewProvider(InspectorProvider.viewType, inspector, { webviewOptions: { retainContextWhenHidden: true } }), SceneEditorProvider.register(context));

	context.subscriptions.push(
		SceneEditorProvider.onDidSelectObject((objectIds, scene) => {
			inspector.setSelection(objectIds, scene);
		}),
	);

	context.subscriptions.push(
		SceneEditorProvider.onDidChangeScene((scene) => {
			inspector.setScene(scene);
		}),
	);

	context.subscriptions.push(
		SceneEditorProvider.onDidRequestSceneSettings((scene) => {
			inspector.showSceneSettings(scene);
			void vscode.commands.executeCommand("libgdx-editor.inspector.focus");
		}),
	);

	// ✅ رویداد تغییر instance فعال — باگ ۷ رفع شد
	context.subscriptions.push(
		SceneRegistry.onDidChangeActiveInstance((instance) => {
			if (!instance) return;
			const scene = instance.getScene();
			if (scene) {
				inspector.setScene(scene);
			}
		}),
	);

	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor((editor) => {
			if (!editor) return;
			const instances = SceneEditorProvider.getAllInstances();
			for (const inst of instances) {
				if (inst.matchesDocument(editor.document)) {
					SceneEditorProvider.setActiveInstance(inst);
					const scene = inst.getCurrentScene();
					if (scene) {
						inspector.setScene(scene);
					}
					break;
				}
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
		onUpdateObject: (obj, historyLabel) => SceneEditorProvider.updateObject(obj, historyLabel ?? "inspector edit"),
		onDeleteObject: (objectId) => SceneEditorProvider.deleteObject(objectId),
		onFocusObject: (objectId) => SceneEditorProvider.focusObject(objectId),
		onUpdateSceneField: (field, value, historyLabel) => SceneEditorProvider.updateSceneField(field, value, historyLabel ?? `scene: ${field}`),
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

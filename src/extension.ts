import * as vscode from "vscode";
import { SceneEditorProvider } from "./editor/SceneEditorProvider.js";
import { InspectorProvider } from "./views/InspectorProvider.js";
import { LayersProvider } from "./views/LayersProvider.js";
import { newSceneCommand } from "./commands/newScene.js";
import { importTextureCommand, cleanupAssetsCommand } from "./commands/importTexture.js";

export function activate(context: vscode.ExtensionContext) {
	console.log("LibGDX Editor activated");

	const inspector = new InspectorProvider(context.extensionUri);
	const layers = new LayersProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(InspectorProvider.viewType, inspector, { webviewOptions: { retainContextWhenHidden: true } }),
		vscode.window.registerWebviewViewProvider(LayersProvider.viewType, layers, { webviewOptions: { retainContextWhenHidden: true } }),
		SceneEditorProvider.register(context),
	);

	context.subscriptions.push(
		SceneEditorProvider.onDidSelectObject((objectIds, scene) => {
			inspector.setSelection(objectIds, scene);
		}),
	);

	context.subscriptions.push(
		SceneEditorProvider.onDidChangeScene((scene) => {
			inspector.setScene(scene);
			layers.setLayers(scene.layers);
		}),
	);

	inspector.setHandlers({
		onUpdateObject: (obj) => SceneEditorProvider.updateObject(obj),
		onDeleteObject: (objectId) => SceneEditorProvider.deleteObject(objectId),
		onFocusObject: (objectId) => SceneEditorProvider.focusObject(objectId),
		onUpdateSceneField: (field, value) => SceneEditorProvider.updateSceneField(field, value),
	});

	layers.setHandlers({
		onAddLayer: () => {
			void SceneEditorProvider.addLayer();
		},
		onDeleteLayer: (name) => {
			void SceneEditorProvider.deleteLayer(name);
		},
		onToggleVisibility: (name) => {
			void SceneEditorProvider.toggleLayerVisibility(name);
		},
		onToggleLock: (name) => {
			void SceneEditorProvider.toggleLayerLock(name);
		},
		onRenameLayer: (oldName, newName) => {
			void SceneEditorProvider.renameLayer(oldName, newName);
		},
		onMoveUp: (name) => {
			void SceneEditorProvider.moveLayerUp(name);
		},
		onMoveDown: (name) => {
			void SceneEditorProvider.moveLayerDown(name);
		},
	});

	context.subscriptions.push(
		vscode.commands.registerCommand("libgdx-editor.newScene", (uri?: vscode.Uri) => newSceneCommand(context, uri)),
		vscode.commands.registerCommand("libgdx-editor.openEditor", async () => {
			const uri = await vscode.window.showOpenDialog({
				canSelectMany: false,
				filters: { "LibGDX Scene": ["lgdx.json"] },
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

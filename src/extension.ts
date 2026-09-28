import * as vscode from "vscode";
import { SceneEditorProvider } from "./editor/SceneEditorProvider.js";
import { OutlinerProvider } from "./views/OutlinerProvider.js";
import { InspectorProvider } from "./views/InspectorProvider.js";

export function activate(context: vscode.ExtensionContext) {
	console.log("LibGDX Editor activated");

	const outliner = new OutlinerProvider();
	const inspector = new InspectorProvider(context.extensionUri);

	context.subscriptions.push(vscode.window.registerTreeDataProvider("libgdx-editor.outliner", outliner), vscode.window.registerWebviewViewProvider(InspectorProvider.viewType, inspector, { webviewOptions: { retainContextWhenHidden: true } }), SceneEditorProvider.register(context));

	context.subscriptions.push(
		vscode.commands.registerCommand("libgdx-editor.selectFromOutliner", (id: string, kind: string) => {
			if (kind !== "object") return;
			SceneEditorProvider.broadcastToAll({
				type: "selectFromOutliner",
				objectId: id,
			});
			inspector.selectObject(id);
		}),
	);

	context.subscriptions.push(
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
	);
}

export function deactivate() {}

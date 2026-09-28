import * as vscode from "vscode";
import { createEmptyScene } from "../types/scene.js";
import { SceneEditorProvider } from "../editor/SceneEditorProvider.js";

export async function newSceneCommand(context: vscode.ExtensionContext, uriFromContext?: vscode.Uri): Promise<void> {
	const name = await vscode.window.showInputBox({
		title: "LibGDX: New Scene",
		prompt: "Scene name (without extension)",
		value: "level1",
		validateInput: (value) => {
			if (!value.trim()) return "Name cannot be empty";
			if (!/^[\w-]+$/.test(value)) {
				return "Only letters, numbers, dash and underscore";
			}
			return null;
		},
	});
	if (!name) return;

	let targetUri: vscode.Uri;

	if (uriFromContext) {
		targetUri = vscode.Uri.joinPath(uriFromContext, `${name}.lgdx.json`);
	} else if (vscode.workspace.workspaceFolders?.length) {
		const root = vscode.workspace.workspaceFolders[0].uri;
		const chosen = await vscode.window.showSaveDialog({
			title: "Save new LibGDX Scene",
			defaultUri: vscode.Uri.joinPath(root, `${name}.lgdx.json`),
			// ✅ فیلتر درست — باگ ۱۰ رفع شد
			filters: { "LibGDX Scene": ["json"] },
		});
		if (!chosen) return;
		targetUri = chosen;
	} else {
		const chosen = await vscode.window.showSaveDialog({
			title: "Save new LibGDX Scene",
			defaultUri: vscode.Uri.file(`${name}.lgdx.json`),
			filters: { "LibGDX Scene": ["json"] },
		});
		if (!chosen) return;
		targetUri = chosen;
	}

	try {
		await vscode.workspace.fs.stat(targetUri);
		const overwrite = await vscode.window.showWarningMessage(`File already exists: ${targetUri.fsPath}`, { modal: true }, "Overwrite");
		if (overwrite !== "Overwrite") return;
	} catch {
		// فایل وجود ندارد — خوب است
	}

	const scene = createEmptyScene(name);
	const content = new TextEncoder().encode(JSON.stringify(scene, null, 2));

	await vscode.workspace.fs.writeFile(targetUri, content);

	await vscode.commands.executeCommand("vscode.openWith", targetUri, SceneEditorProvider.viewType);

	vscode.window.showInformationMessage(`Scene created: ${targetUri.fsPath}`);
}

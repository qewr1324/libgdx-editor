import * as vscode from "vscode";
import { AnimatorEditorProvider } from "../AnimatorEditorProvider.js";

export async function openAnimatorCommand(uri?: vscode.Uri): Promise<void> {
	let targetUri = uri;

	if (!targetUri) {
		const files = await vscode.workspace.findFiles("**/*.lgdxa.json", "**/node_modules/**", 50);
		if (files.length === 0) {
			const create = await vscode.window.showInformationMessage("No animation files found. Create one?", "Create Animation");
			if (create === "Create Animation") {
				await vscode.commands.executeCommand("libgdx-editor.createAnimation");
			}
			return;
		}

		const picked = await vscode.window.showQuickPick(
			files.map((f) => ({
				label: vscode.workspace.asRelativePath(f),
				uri: f,
			})),
			{ title: "Open Animation", placeHolder: "Select an animation file" },
		);
		if (!picked) return;
		targetUri = picked.uri;
	}

	await vscode.commands.executeCommand("vscode.openWith", targetUri, AnimatorEditorProvider.viewType);
}

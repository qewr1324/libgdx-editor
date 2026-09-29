import * as vscode from "vscode";
import * as path from "node:path";
import { AnimatorEditorProvider } from "../AnimatorEditorProvider.js";
import { DEFAULT_ANIMATION } from "../animatorConfig.js";

export async function createAnimationCommand(uriFromContext?: vscode.Uri): Promise<void> {
	// اسم انیمیشن
	const name = await vscode.window.showInputBox({
		title: "LibGDX: New Animation",
		prompt: "Animation name (without extension)",
		value: "player_run",
		validateInput: (value) => {
			if (!value.trim()) return "Name cannot be empty";
			if (!/^[\w-]+$/.test(value)) return "Only letters, numbers, dash, underscore";
			return null;
		},
	});
	if (!name) return;

	// انتخاب صحنه‌ی منبع
	const scenes = await vscode.workspace.findFiles("**/*.lgdx.json", "**/node_modules/**", 100);
	if (scenes.length === 0) {
		vscode.window.showWarningMessage("No scene files found. Create a scene first.");
		return;
	}

	let sourceSceneUri: vscode.Uri | undefined;

	if (scenes.length === 1) {
		sourceSceneUri = scenes[0];
	} else {
		const picked = await vscode.window.showQuickPick(
			scenes.map((f) => ({
				label: vscode.workspace.asRelativePath(f),
				uri: f,
			})),
			{ title: "Select Source Scene", placeHolder: "Which scene does this animation belong to?" },
		);
		if (!picked) return;
		sourceSceneUri = picked.uri;
	}

	// مکان ذخیره: در level1.assets/animations/
	const sceneDir = vscode.Uri.joinPath(sourceSceneUri, "..");
	const sceneName = path.basename(sourceSceneUri.fsPath, ".lgdx.json");
	const animationsDir = vscode.Uri.joinPath(sceneDir, `${sceneName}.assets`, "animations");

	try {
		await vscode.workspace.fs.createDirectory(animationsDir);
	} catch {
		// از قبل هست
	}

	const targetUri = vscode.Uri.joinPath(animationsDir, `${name}.lgdxa.json`);

	// چک وجود
	try {
		await vscode.workspace.fs.stat(targetUri);
		const overwrite = await vscode.window.showWarningMessage(`File already exists: ${targetUri.fsPath}`, { modal: true }, "Overwrite");
		if (overwrite !== "Overwrite") return;
	} catch {
		// وجود نداره، خوبه
	}

	// ساخت محتوا
	const animation = {
		...DEFAULT_ANIMATION,
		name,
		sourceScene: path.basename(sourceSceneUri.fsPath),
	};

	const content = new TextEncoder().encode(JSON.stringify(animation, null, 2));
	await vscode.workspace.fs.writeFile(targetUri, content);

	// باز کردن در ادیتور انیمیشن
	await vscode.commands.executeCommand("vscode.openWith", targetUri, AnimatorEditorProvider.viewType);

	vscode.window.showInformationMessage(`Animation created: ${path.basename(targetUri.fsPath)}`);
}

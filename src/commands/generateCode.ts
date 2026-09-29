import * as vscode from "vscode";
import * as path from "node:path";
import { SceneEditorProvider } from "../editor/SceneEditorProvider.js";
import { generateCode } from "../generator/javaGenerator.js";

export async function generateCodeCommand(): Promise<void> {
	const host = SceneEditorProvider.getActiveProvider();
	if (!host) {
		vscode.window.showWarningMessage("No active LibGDX scene. Open a .lgdx.json file first.");
		return;
	}
	const scene = host.getScene();
	const document = host.getDocument();
	if (!scene || !document) {
		vscode.window.showWarningMessage("Could not read scene.");
		return;
	}

	const defaultClassName = toPascalCase(scene.name || "Scene");
	const className = await vscode.window.showInputBox({
		title: "Generate Code",
		prompt: "Class name",
		value: defaultClassName,
		validateInput: (v) => {
			if (!v.trim()) return "Class name is required";
			if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(v)) return "Invalid identifier";
			return null;
		},
	});
	if (!className) return;

	const language = await vscode.window.showQuickPick(
		[
			{ label: "Java", value: "java" as const, description: "Generate a .java file" },
			{ label: "Kotlin", value: "kotlin" as const, description: "Generate a .kt file" },
		],
		{ title: "Generate Code", placeHolder: "Language" },
	);
	if (!language) return;

	const packageName = await vscode.window.showInputBox({
		title: "Generate Code",
		prompt: "Package name (optional, leave empty to skip)",
		value: "com.example.scenes",
	});

	const ext = language.value === "java" ? "java" : "kt";
	const sceneDir = vscode.Uri.joinPath(document.uri, "..");
	const defaultUri = vscode.Uri.joinPath(sceneDir, `${className}.${ext}`);

	const saveUri = await vscode.window.showSaveDialog({
		title: "Save Generated Code",
		defaultUri,
		filters: language.value === "java" ? { Java: ["java"] } : { Kotlin: ["kt"] },
	});
	if (!saveUri) return;

	const code = generateCode(scene, {
		className,
		packageName: packageName?.trim() || undefined,
		language: language.value,
		includeComments: true,
	});

	await vscode.workspace.fs.writeFile(saveUri, new TextEncoder().encode(code));

	const doc = await vscode.workspace.openTextDocument(saveUri);
	await vscode.window.showTextDocument(doc);

	vscode.window.showInformationMessage(`Generated ${path.basename(saveUri.fsPath)}`);
}

function toPascalCase(s: string): string {
	return s
		.replace(/[^a-zA-Z0-9]+/g, " ")
		.trim()
		.split(/\s+/)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
		.join("");
}

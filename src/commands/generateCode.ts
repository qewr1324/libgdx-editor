// src/commands/generateCode.ts
import * as vscode from "vscode";
import * as path from "node:path";
import { SceneEditorProvider } from "../editor/SceneEditorProvider.js";
import { generateCodeWithHelpers } from "../generator/javaGenerator.js";
import { findComponent } from "../types/components.js";

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

	// 🆕 چک کن آیا صحنه انیمیشن داره
	const hasAnimation = scene.layers.some((layer) => layer.objects.some((obj) => !!findComponent(obj.components, "animation")));

	// 🆕 اگه انیمیشن داشت، بپرس AnimatedActor رو هم بسازه یا نه
	let includeAnimatedActorHelper = false;
	if (hasAnimation) {
		const choice = await vscode.window.showQuickPick(
			[
				{ label: "Yes", value: true, description: "Also generate AnimatedActor helper class" },
				{ label: "No", value: false, description: "Only generate the main scene file" },
			],
			{ title: "Generate Code", placeHolder: "Include AnimatedActor helper?" },
		);
		if (!choice) return;
		includeAnimatedActorHelper = choice.value;
	}

	const ext = language.value === "java" ? "java" : "kt";
	const sceneDir = vscode.Uri.joinPath(document.uri, "..");
	const defaultUri = vscode.Uri.joinPath(sceneDir, `${className}.${ext}`);

	const saveUri = await vscode.window.showSaveDialog({
		title: "Save Generated Code",
		defaultUri,
		filters: language.value === "java" ? { Java: ["java"] } : { Kotlin: ["kt"] },
	});
	if (!saveUri) return;

	const result = generateCodeWithHelpers(scene, {
		className,
		packageName: packageName?.trim() || undefined,
		language: language.value,
		includeComments: true,
		includeAnimatedActorHelper,
		helperPackageName: packageName?.trim() || undefined,
	});

	// فایل اصلی
	await vscode.workspace.fs.writeFile(saveUri, new TextEncoder().encode(result.main));

	// فایل‌های کمکی
	const helperUris: vscode.Uri[] = [];
	for (const helper of result.helpers) {
		const helperUri = vscode.Uri.joinPath(saveUri, "..", helper.fileName);
		await vscode.workspace.fs.writeFile(helperUri, new TextEncoder().encode(helper.content));
		helperUris.push(helperUri);
	}

	// فایل اصلی رو باز کن
	const doc = await vscode.workspace.openTextDocument(saveUri);
	await vscode.window.showTextDocument(doc);

	// پیام موفقیت
	if (helperUris.length > 0) {
		const names = helperUris.map((u) => path.basename(u.fsPath)).join(", ");
		vscode.window.showInformationMessage(`Generated ${path.basename(saveUri.fsPath)} + ${names}`);
	} else {
		vscode.window.showInformationMessage(`Generated ${path.basename(saveUri.fsPath)}`);
	}
}

function toPascalCase(s: string): string {
	return s
		.replace(/[^a-zA-Z0-9]+/g, " ")
		.trim()
		.split(/\s+/)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
		.join("");
}

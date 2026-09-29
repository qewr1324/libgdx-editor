import * as vscode from "vscode";
import { DEFAULT_ANIMATION, type Animation } from "./animatorConfig.js";

export function parseAnimationDocument(document: vscode.TextDocument): Animation {
	const text = document.getText();
	if (!text.trim()) {
		return { ...DEFAULT_ANIMATION };
	}
	try {
		const parsed = JSON.parse(text) as Partial<Animation>;
		return migrateAnimation(parsed);
	} catch {
		vscode.window.showErrorMessage("Invalid animation file. Using defaults.");
		return { ...DEFAULT_ANIMATION };
	}
}

export function migrateAnimation(parsed: Partial<Animation>): Animation {
	const tracks = (parsed.tracks ?? []).map((t) => ({
		objectId: t.objectId ?? "",
		property: t.property ?? "transform.x",
		keyframes: (t.keyframes ?? []).map((k) => ({
			time: k.time ?? 0,
			value: k.value ?? 0,
			easing: k.easing ?? "linear",
		})),
	}));

	return {
		version: parsed.version ?? "1.0",
		name: parsed.name ?? "animation",
		sourceScene: parsed.sourceScene ?? "",
		targetObjectId: parsed.targetObjectId,
		duration: parsed.duration ?? 1000,
		fps: parsed.fps ?? 30,
		loop: parsed.loop ?? true,
		autoPlay: parsed.autoPlay ?? false,
		tracks,
	};
}

export async function writeAnimationDocument(document: vscode.TextDocument, animation: Animation): Promise<void> {
	const edit = new vscode.WorkspaceEdit();
	const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
	edit.replace(document.uri, fullRange, JSON.stringify(animation, null, 2));
	await vscode.workspace.applyEdit(edit);
}

export async function saveAnimationDocument(document: vscode.TextDocument): Promise<void> {
	if (document.isDirty) {
		await document.save();
	}
}

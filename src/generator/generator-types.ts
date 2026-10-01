// src/generator/generator-types.ts
import type { Scene } from "../types/scene.js";

export interface GenerateOptions {
	className: string;
	packageName?: string;
	language: "java" | "kotlin";
	includeComments: boolean;
	/** اگه true، فایل AnimatedActor.java هم تولید بشه */
	includeAnimatedActorHelper: boolean;
	/** 🆕 اگه true، فایل ShapeActors.java تولید بشه (وقتی shape وجود داره) */
	includeShapeActorsHelper: boolean;
	/** 🆕 اگه true، فایل LabelActor.java تولید بشه (وقتی text وجود داره) */
	includeLabelActorHelper: boolean;
	/** پکیج برای فایل‌های کمکی */
	helperPackageName?: string;
}

export interface GeneratedFile {
	fileName: string;
	content: string;
}

export interface GenerateResult {
	mainFile: GeneratedFile;
	helperFiles: GeneratedFile[];
}

export const DEFAULT_GENERATE_OPTIONS: GenerateOptions = {
	className: "Scene",
	packageName: undefined,
	language: "java",
	includeComments: true,
	includeAnimatedActorHelper: true,
	includeShapeActorsHelper: true,
	includeLabelActorHelper: true,
};

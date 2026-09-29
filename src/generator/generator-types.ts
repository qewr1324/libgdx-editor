// src/generator/generator-types.ts
import type { Scene } from "../types/scene.js";

export interface GenerateOptions {
	className: string;
	packageName?: string;
	language: "java" | "kotlin";
	includeComments: boolean;
	/** اگه true، فایل AnimatedActor.java هم تولید بشه */
	includeAnimatedActorHelper: boolean;
	/** پکیج برای فایل کمکی AnimatedActor */
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
};

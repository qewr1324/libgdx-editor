import type { GameObject, Scene } from "../types/scene.js";
import type { ShapeType } from "../config/config-types.js";

export interface GenerateOptions {
	className: string;
	packageName?: string;
	language: "java" | "kotlin";
	includeComments: boolean;
}

export function generateCode(scene: Scene, options: GenerateOptions): string {
	if (options.language === "java") {
		return generateJava(scene, options);
	}
	return generateKotlin(scene, options);
}

// ============================================================
// Java
// ============================================================

function generateJava(scene: Scene, options: GenerateOptions): string {
	const { className, packageName, includeComments } = options;
	const lines: string[] = [];

	if (packageName) {
		lines.push(`package ${packageName};`);
		lines.push("");
	}

	lines.push(`import com.badlogic.gdx.assets.AssetManager;`);
	lines.push(`import com.badlogic.gdx.graphics.Texture;`);
	lines.push(`import com.badlogic.gdx.graphics.g2d.Sprite;`);
	lines.push(`import com.badlogic.gdx.scenes.scene2d.Stage;`);
	lines.push(`import com.badlogic.gdx.scenes.scene2d.Actor;`);
	lines.push(`import com.badlogic.gdx.scenes.scene2d.ui.Image;`);
	lines.push(`import com.badlogic.gdx.utils.Align;`);
	lines.push("");

	if (includeComments) {
		lines.push(`/**`);
		lines.push(` * Auto-generated from LibGDX Editor.`);
		lines.push(` * Scene: ${scene.name}`);
		lines.push(` * World size: ${scene.worldSize.width}x${scene.worldSize.height}`);
		lines.push(` * Generated: ${new Date().toISOString()}`);
		lines.push(` */`);
	}

	lines.push(`public class ${className} {`);
	lines.push("");
	lines.push(`\tpublic static final float WORLD_WIDTH = ${scene.worldSize.width}f;`);
	lines.push(`\tpublic static final float WORLD_HEIGHT = ${scene.worldSize.height}f;`);
	lines.push("");

	if (includeComments) {
		lines.push(`\t/**`);
		lines.push(`\t * Populates the given Stage with all objects from the scene.`);
		lines.push(`\t */`);
	}
	lines.push(`\tpublic static void create(Stage stage, AssetManager assets) {`);

	const allObjects: GameObject[] = [];
	for (const layer of scene.layers) {
		if (!layer.visible) continue;
		for (const obj of layer.objects) {
			allObjects.push(obj);
		}
	}
	allObjects.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

	for (const obj of allObjects) {
		lines.push("");
		lines.push(...generateJavaObject(obj, includeComments));
	}

	lines.push(`\t}`);
	lines.push(`}`);

	return lines.join("\n");
}

function generateJavaObject(obj: GameObject, includeComments: boolean): string[] {
	const lines: string[] = [];
	const t = obj.transform;
	const varName = sanitizeIdentifier(obj.name);
	const comment = includeComments ? `\t\t// ${obj.name} (${obj.type})` : "";

	if (comment) lines.push(comment);

	if (obj.type === "sprite" && obj.texture) {
		lines.push(`\t\tImage ${varName} = new Image(assets.get("${obj.texture}", Texture.class));`);
		lines.push(`\t\t${varName}.setSize(${t.width}f, ${t.height}f);`);
		lines.push(`\t\t${varName}.setPosition(${t.x - t.width * t.originX}f, ${t.y - t.height * t.originY}f);`);
		if (t.rotation !== 0) {
			lines.push(`\t\t${varName}.setRotation(${t.rotation}f);`);
		}
		if (t.originX !== 0 || t.originY !== 0) {
			lines.push(`\t\t${varName}.setOrigin(${t.width * t.originX}f, ${t.height * t.originY}f);`);
		}
		if (obj.color && obj.color !== "#ffffff") {
			const c = hexToRgbaFloat(obj.color);
			lines.push(`\t\t${varName}.setColor(${c.r}f, ${c.g}f, ${c.b}f, ${c.a}f);`);
		}
		lines.push(`\t\tstage.addActor(${varName});`);
	} else if (obj.type === "shape") {
		const shapeType = (obj.properties?.shapeType as ShapeType) ?? "rectangle";
		const color = obj.color ? hexToRgbaFloat(obj.color) : { r: 0.29, g: 0.62, b: 1.0, a: 1.0 };

		lines.push(`\t\t// TODO: implement a custom Actor for ${shapeType}`);
		lines.push(`\t\t// size: ${t.width}x${t.height}, position: (${t.x}, ${t.y})`);
		lines.push(`\t\t// color: rgba(${color.r}f, ${color.g}f, ${color.b}f, ${color.a}f)`);
		lines.push(`\t\t// ${shapeTypeToActorName(shapeType)} ${varName} = new ${shapeTypeToActorName(shapeType)}(${t.width}f, ${t.height}f);`);
		lines.push(`\t\t// ${varName}.setPosition(${t.x - t.width * t.originX}f, ${t.y - t.height * t.originY}f);`);
		lines.push(`\t\t// stage.addActor(${varName});`);
	} else if (obj.type === "text") {
		lines.push(`\t\t// TODO: Label ${varName} = new Label("${obj.name}", skin);`);
		lines.push(`\t\t// ${varName}.setPosition(${t.x}f, ${t.y}f);`);
		lines.push(`\t\t// stage.addActor(${varName});`);
	} else if (obj.type === "group") {
		lines.push(`\t\t// TODO: Group ${varName} = new Group();`);
		lines.push(`\t\t// ${varName}.setPosition(${t.x}f, ${t.y}f);`);
		lines.push(`\t\t// stage.addActor(${varName});`);
	}

	return lines;
}

function shapeTypeToActorName(shape: ShapeType): string {
	switch (shape) {
		case "rectangle":
			return "RectangleActor";
		case "circle":
			return "CircleActor";
		case "triangle":
			return "TriangleActor";
		case "diamond":
			return "DiamondActor";
		case "pentagon":
			return "PentagonActor";
		case "hexagon":
			return "HexagonActor";
		case "star":
			return "StarActor";
		default:
			return "RectangleActor";
	}
}

// ============================================================
// Kotlin
// ============================================================

function generateKotlin(scene: Scene, options: GenerateOptions): string {
	const { className, packageName, includeComments } = options;
	const lines: string[] = [];

	if (packageName) {
		lines.push(`package ${packageName}`);
		lines.push("");
	}

	lines.push(`import com.badlogic.gdx.assets.AssetManager`);
	lines.push(`import com.badlogic.gdx.graphics.Texture`);
	lines.push(`import com.badlogic.gdx.graphics.g2d.Sprite`);
	lines.push(`import com.badlogic.gdx.scenes.scene2d.Stage`);
	lines.push(`import com.badlogic.gdx.scenes.scene2d.ui.Image`);
	lines.push("");

	if (includeComments) {
		lines.push(`/**`);
		lines.push(` * Auto-generated from LibGDX Editor.`);
		lines.push(` * Scene: ${scene.name}`);
		lines.push(` * Generated: ${new Date().toISOString()}`);
		lines.push(` */`);
	}

	lines.push(`object ${className} {`);
	lines.push("");
	lines.push(`    const val WORLD_WIDTH = ${scene.worldSize.width}f`);
	lines.push(`    const val WORLD_HEIGHT = ${scene.worldSize.height}f`);
	lines.push("");

	if (includeComments) {
		lines.push(`    /**`);
		lines.push(`     * Populates the Stage with all scene objects.`);
		lines.push(`     */`);
	}
	lines.push(`    fun create(stage: Stage, assets: AssetManager) {`);

	const allObjects: GameObject[] = [];
	for (const layer of scene.layers) {
		if (!layer.visible) continue;
		for (const obj of layer.objects) allObjects.push(obj);
	}
	allObjects.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

	for (const obj of allObjects) {
		lines.push("");
		lines.push(...generateKotlinObject(obj, includeComments));
	}

	lines.push(`    }`);
	lines.push(`}`);

	return lines.join("\n");
}

function generateKotlinObject(obj: GameObject, includeComments: boolean): string[] {
	const lines: string[] = [];
	const t = obj.transform;
	const varName = sanitizeIdentifier(obj.name);

	if (includeComments) {
		lines.push(`        // ${obj.name} (${obj.type})`);
	}

	if (obj.type === "sprite" && obj.texture) {
		lines.push(`        val ${varName} = Image(assets.get("${obj.texture}", Texture::class.java))`);
		lines.push(`        ${varName}.setSize(${t.width}f, ${t.height}f)`);
		lines.push(`        ${varName}.setPosition(${t.x - t.width * t.originX}f, ${t.y - t.height * t.originY}f)`);
		if (t.rotation !== 0) {
			lines.push(`        ${varName}.rotation = ${t.rotation}f`);
		}
		if (t.originX !== 0 || t.originY !== 0) {
			lines.push(`        ${varName}.setOrigin(${t.width * t.originX}f, ${t.height * t.originY}f)`);
		}
		lines.push(`        stage.addActor(${varName})`);
	} else if (obj.type === "shape") {
		const shapeType = (obj.properties?.shapeType as ShapeType) ?? "rectangle";
		lines.push(`        // TODO: create a custom Actor for ${shapeType}`);
		lines.push(`        // size: ${t.width}x${t.height}, position: (${t.x}, ${t.y})`);
	} else if (obj.type === "text") {
		lines.push(`        // TODO: Label ${varName} = Label("${obj.name}", skin)`);
	}

	return lines;
}

// ============================================================
// Helpers
// ============================================================

function sanitizeIdentifier(name: string): string {
	let id = name.replace(/[^a-zA-Z0-9_]/g, "_");
	if (/^[0-9]/.test(id)) {
		id = "_" + id;
	}
	return id;
}

function hexToRgbaFloat(hex: string): { r: number; g: number; b: number; a: number } {
	const h = hex.replace("#", "");
	if (h.length !== 6 && h.length !== 8) {
		return { r: 1, g: 1, b: 1, a: 1 };
	}
	const r = parseInt(h.substring(0, 2), 16) / 255;
	const g = parseInt(h.substring(2, 4), 16) / 255;
	const b = parseInt(h.substring(4, 6), 16) / 255;
	const a = h.length === 8 ? parseInt(h.substring(6, 8), 16) / 255 : 1;
	return { r: round3(r), g: round3(g), b: round3(b), a: round3(a) };
}

function round3(n: number): number {
	return Math.round(n * 1000) / 1000;
}

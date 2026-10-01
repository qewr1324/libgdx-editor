// src/generator/javaGenerator.ts
import type { GameObject, Scene } from "../types/scene.js";
import type { Component, ShapeType, AnimationComponent, ShapeComponent, TextComponent } from "../types/components.js";
import { findComponent } from "../types/components.js";
import type { GenerateOptions } from "./generator-types.js";
import { generateAnimatedActorFile } from "./javaAnimatedActor.js";
import { generateShapeActorsFile } from "./javaShapeActors.js";
import { generateLabelActorFile } from "./javaLabelActor.js";
import { getAtlasProperties } from "../features/texture-atlas/atlas-properties.js";

export type { GenerateOptions, GeneratedFile, GenerateResult } from "./generator-types.js";

// ============================================================
// Entry point
// ============================================================

export function generateCode(scene: Scene, options: GenerateOptions): string {
	if (options.language === "java") {
		return generateJava(scene, options);
	}
	return generateKotlin(scene, options);
}

export function generateCodeWithHelpers(scene: Scene, options: GenerateOptions): { main: string; helpers: Array<{ fileName: string; content: string }> } {
	const main = generateCode(scene, options);
	const helpers: Array<{ fileName: string; content: string }> = [];

	// ---------- Animation helper ----------
	const hasAnimation = scene.layers.some((l) => l.objects.some((o) => !!findComponent(o.components, "animation")));
	if (hasAnimation && options.includeAnimatedActorHelper) {
		helpers.push(generateAnimatedActorFile(options));
	}

	// ---------- 🆕 Shape helper ----------
	const hasShape = scene.layers.some((l) => l.objects.some((o) => !!findComponent(o.components, "shape")));
	if (hasShape && options.includeShapeActorsHelper) {
		helpers.push(generateShapeActorsFile(options));
	}

	// ---------- 🆕 Text helper ----------
	const hasText = scene.layers.some((l) => l.objects.some((o) => !!findComponent(o.components, "text")));
	if (hasText && options.includeLabelActorHelper) {
		helpers.push(generateLabelActorFile(options));
	}

	return { main, helpers };
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
	lines.push(`import com.badlogic.gdx.graphics.Color;`);
	lines.push(`import com.badlogic.gdx.graphics.Texture;`);
	lines.push(`import com.badlogic.gdx.graphics.g2d.Animation;`);
	lines.push(`import com.badlogic.gdx.graphics.g2d.BitmapFont;`);
	lines.push(`import com.badlogic.gdx.graphics.g2d.TextureAtlas;`);
	lines.push(`import com.badlogic.gdx.graphics.g2d.TextureRegion;`);
	lines.push(`import com.badlogic.gdx.graphics.glutils.ShapeRenderer;`);
	lines.push(`import com.badlogic.gdx.scenes.scene2d.Stage;`);
	lines.push(`import com.badlogic.gdx.scenes.scene2d.Actor;`);
	lines.push(`import com.badlogic.gdx.scenes.scene2d.ui.Image;`);
	lines.push(`import com.badlogic.gdx.scenes.scene2d.utils.TextureRegionDrawable;`);
	lines.push(`import com.badlogic.gdx.utils.Align;`);
	lines.push("");

	if (includeComments) {
		lines.push(`/**`);
		lines.push(` * Auto-generated from LibGDX Editor.`);
		lines.push(` * Scene: ${scene.name}`);
		lines.push(` * World size: ${scene.worldSize.width}x${scene.worldSize.height}`);
		lines.push(` * Generated: ${new Date().toISOString()}`);
		lines.push(` *`);
		lines.push(` * IMPORTANT:`);
		lines.push(` *   - If scene has shapes, you must set "ShapeActors.sharedRenderer".`);
		lines.push(` *   - If scene has text, you must provide a BitmapFont.`);
		lines.push(` */`);
	}

	lines.push(`public class ${className} {`);
	lines.push("");
	lines.push(`\tpublic static final float WORLD_WIDTH = ${scene.worldSize.width}f;`);
	lines.push(`\tpublic static final float WORLD_HEIGHT = ${scene.worldSize.height}f;`);
	lines.push("");

	// چک کنیم آیا shape داریم — اگه بله، یه ShapeRenderer static می‌سازیم
	const hasShape = scene.layers.some((l) => l.objects.some((o) => !!findComponent(o.components, "shape")));
	if (hasShape) {
		lines.push(`\t/** Shared ShapeRenderer — initialized by create() */`);
		lines.push(`\tprivate static ShapeRenderer shapeRenderer;`);
		lines.push("");
	}

	if (includeComments) {
		lines.push(`\t/**`);
		lines.push(`\t * Populates the given Stage with all objects from the scene.`);
		lines.push(`\t */`);
	}
	lines.push(`\tpublic static void create(Stage stage, AssetManager assets) {`);

	if (hasShape) {
		lines.push(`\t\tshapeRenderer = new ShapeRenderer();`);
		lines.push(`\t\tShapeActors.sharedRenderer = shapeRenderer;`);
	}

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
	lines.push("");

	if (hasShape) {
		if (includeComments) {
			lines.push(`\t/**`);
			lines.push(`\t * Call this in dispose() to clean up the ShapeRenderer.`);
			lines.push(`\t */`);
		}
		lines.push(`\tpublic static void dispose() {`);
		lines.push(`\t\tif (shapeRenderer != null) {`);
		lines.push(`\t\t\tshapeRenderer.dispose();`);
		lines.push(`\t\t\tshapeRenderer = null;`);
		lines.push(`\t\t\tShapeActors.sharedRenderer = null;`);
		lines.push(`\t\t}`);
		lines.push(`\t}`);
	}

	lines.push(`}`);

	return lines.join("\n");
}

function generateJavaObject(obj: GameObject, includeComments: boolean): string[] {
	const lines: string[] = [];
	const t = obj.transform;
	const varName = sanitizeIdentifier(obj.name);
	const components = obj.components ?? [];
	const atlasProps = getAtlasProperties(obj);

	// ---------- Atlas ----------
	if (atlasProps && atlasProps.texture) {
		if (includeComments) {
			lines.push(`\t\t// ${obj.name} (atlas, mode=${atlasProps.mode})`);
		}
		lines.push(...generateJavaAtlas(atlasProps, obj, varName));
		return lines;
	}

	if (includeComments) {
		lines.push(`\t\t// ${obj.name} (${obj.type}, ${components.length} components)`);
	}

	if (components.length === 0) {
		if (includeComments) lines.push(`\t\t// (no components — empty game object)`);
		return lines;
	}

	const animationComp = findComponent(components, "animation");
	const spriteComp = findComponent(components, "sprite");
	const shapeComp = findComponent(components, "shape");
	const textComp = findComponent(components, "text");

	// ---------- Animation ----------
	if (animationComp) {
		lines.push(...generateJavaAnimation(animationComp, obj, varName));
		return lines;
	}

	// ---------- Sprite ----------
	if (spriteComp && spriteComp.texture) {
		lines.push(`\t\tTexture ${varName}Tex = assets.get("${spriteComp.texture}", Texture.class);`);
		lines.push(`\t\tImage ${varName} = new Image(new TextureRegionDrawable(new TextureRegion(${varName}Tex)));`);
		lines.push(`\t\t${varName}.setSize(${t.width}f, ${t.height}f);`);
		lines.push(`\t\t${varName}.setPosition(${t.x - t.width * t.originX}f, ${t.y - t.height * t.originY}f);`);
		lines.push(`\t\t${varName}.setOrigin(${t.width * t.originX}f, ${t.height * t.originY}f);`);
		if (t.rotation !== 0) {
			lines.push(`\t\t${varName}.setRotation(${t.rotation}f);`);
		}
		if (spriteComp.tint && spriteComp.tint !== "#ffffff") {
			const c = hexToRgbaFloat(spriteComp.tint);
			lines.push(`\t\t${varName}.setColor(new Color(${c.r}f, ${c.g}f, ${c.b}f, ${c.a}f));`);
		}
		lines.push(`\t\tstage.addActor(${varName});`);
		return lines;
	}

	// ---------- 🆕 Shape (واقعی) ----------
	if (shapeComp) {
		lines.push(...generateJavaShape(shapeComp, obj, varName));
		return lines;
	}

	// ---------- 🆕 Text (واقعی) ----------
	if (textComp) {
		lines.push(...generateJavaText(textComp, obj, varName, includeComments));
		return lines;
	}

	if (includeComments) {
		lines.push(`\t\t// (no supported component found)`);
	}
	return lines;
}

// ============================================================
// 🆕 Shape generation
// ============================================================

function generateJavaShape(shapeComp: ShapeComponent, obj: GameObject, varName: string): string[] {
	const lines: string[] = [];
	const t = obj.transform;
	const c = hexToRgbaFloat(shapeComp.color);

	const actorType = shapeTypeToActorName(shapeComp.shape);

	lines.push(`\t\tShapeActors.${actorType} ${varName} = new ShapeActors.${actorType}(${t.width}f, ${t.height}f);`);
	lines.push(`\t\t${varName}.setShapeColor(new Color(${c.r}f, ${c.g}f, ${c.b}f, ${c.a}f));`);
	lines.push(`\t\t${varName}.setFilled(${shapeComp.filled ? "true" : "false"});`);
	if (shapeComp.strokeWidth && shapeComp.strokeWidth > 0) {
		lines.push(`\t\t${varName}.setStrokeWidth(${shapeComp.strokeWidth}f);`);
	}
	lines.push(`\t\t${varName}.setPosition(${t.x - t.width * t.originX}f, ${t.y - t.height * t.originY}f);`);
	lines.push(`\t\t${varName}.setOrigin(${t.width * t.originX}f, ${t.height * t.originY}f);`);
	if (t.rotation !== 0) {
		lines.push(`\t\t${varName}.setRotation(${t.rotation}f);`);
	}
	lines.push(`\t\tstage.addActor(${varName});`);

	return lines;
}

// ============================================================
// 🆕 Text generation
// ============================================================

function generateJavaText(textComp: TextComponent, obj: GameObject, varName: string, includeComments: boolean): string[] {
	const lines: string[] = [];
	const t = obj.transform;
	const c = hexToRgbaFloat(textComp.color);

	if (includeComments) {
		lines.push(`\t\t// You must provide a BitmapFont. Example:`);
		lines.push(`\t\t// BitmapFont ${varName}Font = new BitmapFont();`);
	}

	lines.push(`\t\tBitmapFont ${varName}Font = new BitmapFont();`);
	if (textComp.fontSize && textComp.fontSize !== 16) {
		const scale = textComp.fontSize / 16;
		lines.push(`\t\t${varName}Font.getData().setScale(${scale}f);`);
	}
	lines.push(`\t\tLabelActor ${varName} = new LabelActor("${escapeJavaString(textComp.text)}", ${varName}Font);`);
	lines.push(`\t\t${varName}.setTextColor(new Color(${c.r}f, ${c.g}f, ${c.b}f, ${c.a}f));`);
	lines.push(`\t\t${varName}.setPosition(${t.x - t.width * t.originX}f, ${t.y - t.height * t.originY}f);`);
	if (t.rotation !== 0) {
		lines.push(`\t\t${varName}.setRotation(${t.rotation}f);`);
	}
	lines.push(`\t\tstage.addActor(${varName});`);

	return lines;
}

// ============================================================
// Atlas generation
// ============================================================

function generateJavaAtlas(atlasProps: NonNullable<ReturnType<typeof getAtlasProperties>>, obj: GameObject, varName: string): string[] {
	const lines: string[] = [];
	const t = obj.transform;

	if (!atlasProps.atlasPath) {
		lines.push(`\t\tTexture ${varName}Tex = assets.get("${atlasProps.texture}", Texture.class);`);
		lines.push(`\t\tImage ${varName} = new Image(new TextureRegionDrawable(new TextureRegion(${varName}Tex)));`);
		lines.push(`\t\t${varName}.setSize(${t.width}f, ${t.height}f);`);
		lines.push(`\t\t${varName}.setPosition(${t.x - t.width * t.originX}f, ${t.y - t.height * t.originY}f);`);
		lines.push(`\t\t${varName}.setOrigin(${t.width * t.originX}f, ${t.height * t.originY}f);`);
		if (t.rotation !== 0) {
			lines.push(`\t\t${varName}.setRotation(${t.rotation}f);`);
		}
		lines.push(`\t\tstage.addActor(${varName});`);
		return lines;
	}

	lines.push(`\t\tTextureAtlas ${varName}Atlas = assets.get("${atlasProps.atlasPath}", TextureAtlas.class);`);

	if (atlasProps.mode === "single" && atlasProps.region) {
		lines.push(`\t\tTextureRegion ${varName}Region = ${varName}Atlas.findRegion("${atlasProps.region}");`);
		lines.push(`\t\tImage ${varName} = new Image(new TextureRegionDrawable(${varName}Region));`);
		lines.push(`\t\t${varName}.setSize(${t.width}f, ${t.height}f);`);
		lines.push(`\t\t${varName}.setPosition(${t.x - t.width * t.originX}f, ${t.y - t.height * t.originY}f);`);
		lines.push(`\t\t${varName}.setOrigin(${t.width * t.originX}f, ${t.height * t.originY}f);`);
		if (t.rotation !== 0) {
			lines.push(`\t\t${varName}.setRotation(${t.rotation}f);`);
		}
		if (atlasProps.tint && atlasProps.tint !== "#ffffff") {
			const c = hexToRgbaFloat(atlasProps.tint);
			lines.push(`\t\t${varName}.setColor(new Color(${c.r}f, ${c.g}f, ${c.b}f, ${c.a}f));`);
		}
		lines.push(`\t\tstage.addActor(${varName});`);
	} else if (atlasProps.mode === "grid") {
		const cols = atlasProps.gridCols ?? 1;
		const rows = atlasProps.gridRows ?? 1;
		const start = atlasProps.startIndex ?? 0;
		lines.push(`\t\t// Grid mode: ${cols}x${rows}, start index: ${start}`);
		lines.push(`\t\t// TODO: implement grid slicing using regions.slice(${start}, ${start + cols * rows})`);
		lines.push(`\t\tTextureRegion ${varName}Region = ${varName}Atlas.getRegions().get(${start});`);
		lines.push(`\t\tImage ${varName} = new Image(new TextureRegionDrawable(${varName}Region));`);
		lines.push(`\t\t${varName}.setSize(${t.width}f, ${t.height}f);`);
		lines.push(`\t\t${varName}.setPosition(${t.x - t.width * t.originX}f, ${t.y - t.height * t.originY}f);`);
		lines.push(`\t\tstage.addActor(${varName});`);
	}

	return lines;
}

// ============================================================
// Animation generation
// ============================================================

function generateJavaAnimation(anim: AnimationComponent, obj: GameObject, varName: string): string[] {
	const lines: string[] = [];
	const t = obj.transform;

	lines.push(`\t\tTextureAtlas ${varName}Atlas = assets.get("${anim.atlasPath}", TextureAtlas.class);`);
	lines.push(`\t\tAnimation<TextureRegion> ${varName}Anim = new Animation<>(1f / ${anim.fps}f,`);

	const frameLines: string[] = [];
	for (const frame of anim.frames) {
		frameLines.push(`\t\t\t${varName}Atlas.findRegion("${frame}")`);
	}
	for (let i = 0; i < frameLines.length; i++) {
		const isLast = i === frameLines.length - 1;
		lines.push(frameLines[i] + (isLast ? "" : ","));
	}

	lines.push(`\t\t);`);
	lines.push(`\t\t${varName}Anim.setPlayMode(Animation.PlayMode.${anim.playMode});`);

	lines.push(`\t\tAnimatedActor ${varName} = new AnimatedActor(${varName}Anim);`);
	lines.push(`\t\t${varName}.setSize(${t.width}f, ${t.height}f);`);
	lines.push(`\t\t${varName}.setPosition(${t.x - t.width * t.originX}f, ${t.y - t.height * t.originY}f);`);
	lines.push(`\t\t${varName}.setOrigin(${t.width * t.originX}f, ${t.height * t.originY}f);`);
	if (t.rotation !== 0) {
		lines.push(`\t\t${varName}.setRotation(${t.rotation}f);`);
	}
	lines.push(`\t\t${varName}.setLooping(${anim.loop ? "true" : "false"});`);
	lines.push(`\t\t${varName}.setPlaying(${anim.autoplay ? "true" : "false"});`);
	lines.push(`\t\tstage.addActor(${varName});`);

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
	lines.push(`import com.badlogic.gdx.graphics.Color`);
	lines.push(`import com.badlogic.gdx.graphics.Texture`);
	lines.push(`import com.badlogic.gdx.graphics.g2d.Animation`);
	lines.push(`import com.badlogic.gdx.graphics.g2d.BitmapFont`);
	lines.push(`import com.badlogic.gdx.graphics.g2d.TextureAtlas`);
	lines.push(`import com.badlogic.gdx.graphics.g2d.TextureRegion`);
	lines.push(`import com.badlogic.gdx.graphics.glutils.ShapeRenderer`);
	lines.push(`import com.badlogic.gdx.scenes.scene2d.Stage`);
	lines.push(`import com.badlogic.gdx.scenes.scene2d.ui.Image`);
	lines.push(`import com.badlogic.gdx.scenes.scene2d.utils.TextureRegionDrawable`);
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

	const hasShape = scene.layers.some((l) => l.objects.some((o) => !!findComponent(o.components, "shape")));
	if (hasShape) {
		lines.push(`    private var shapeRenderer: ShapeRenderer? = null`);
		lines.push("");
	}

	if (includeComments) {
		lines.push(`    /**`);
		lines.push(`     * Populates the Stage with all scene objects.`);
		lines.push(`     */`);
	}
	lines.push(`    fun create(stage: Stage, assets: AssetManager) {`);

	if (hasShape) {
		lines.push(`        val sr = ShapeRenderer()`);
		lines.push(`        shapeRenderer = sr`);
		lines.push(`        ShapeActors.sharedRenderer = sr`);
	}

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
	lines.push("");

	if (hasShape) {
		lines.push(`    fun dispose() {`);
		lines.push(`        shapeRenderer?.dispose()`);
		lines.push(`        shapeRenderer = null`);
		lines.push(`        ShapeActors.sharedRenderer = null`);
		lines.push(`    }`);
	}

	lines.push(`}`);

	return lines.join("\n");
}

function generateKotlinObject(obj: GameObject, includeComments: boolean): string[] {
	const lines: string[] = [];
	const t = obj.transform;
	const varName = sanitizeIdentifier(obj.name);
	const components = obj.components ?? [];
	const atlasProps = getAtlasProperties(obj);

	if (atlasProps && atlasProps.texture) {
		if (includeComments) {
			lines.push(`        // ${obj.name} (atlas, mode=${atlasProps.mode})`);
		}
		lines.push(...generateKotlinAtlas(atlasProps, obj, varName));
		return lines;
	}

	if (includeComments) {
		lines.push(`        // ${obj.name} (${obj.type}, ${components.length} components)`);
	}

	if (components.length === 0) {
		if (includeComments) lines.push(`        // (no components — empty game object)`);
		return lines;
	}

	const animationComp = findComponent(components, "animation");
	const spriteComp = findComponent(components, "sprite");
	const shapeComp = findComponent(components, "shape");
	const textComp = findComponent(components, "text");

	if (animationComp) {
		lines.push(...generateKotlinAnimation(animationComp, obj, varName));
		return lines;
	}

	if (spriteComp && spriteComp.texture) {
		lines.push(`        val ${varName}Tex = assets.get("${spriteComp.texture}", Texture::class.java)`);
		lines.push(`        val ${varName} = Image(TextureRegionDrawable(TextureRegion(${varName}Tex)))`);
		lines.push(`        ${varName}.setSize(${t.width}f, ${t.height}f)`);
		lines.push(`        ${varName}.setPosition(${t.x - t.width * t.originX}f, ${t.y - t.height * t.originY}f)`);
		lines.push(`        ${varName}.setOrigin(${t.width * t.originX}f, ${t.height * t.originY}f)`);
		if (t.rotation !== 0) {
			lines.push(`        ${varName}.rotation = ${t.rotation}f`);
		}
		lines.push(`        stage.addActor(${varName})`);
		return lines;
	}

	// 🆕 Shape
	if (shapeComp) {
		lines.push(...generateKotlinShape(shapeComp, obj, varName));
		return lines;
	}

	// 🆕 Text
	if (textComp) {
		lines.push(...generateKotlinText(textComp, obj, varName));
		return lines;
	}

	return lines;
}

function generateKotlinShape(shapeComp: ShapeComponent, obj: GameObject, varName: string): string[] {
	const lines: string[] = [];
	const t = obj.transform;
	const c = hexToRgbaFloat(shapeComp.color);

	const actorType = shapeTypeToActorName(shapeComp.shape);

	lines.push(`        val ${varName} = ShapeActors.${actorType}(${t.width}f, ${t.height}f)`);
	lines.push(`        ${varName}.shapeColor.set(${c.r}f, ${c.g}f, ${c.b}f, ${c.a}f)`);
	lines.push(`        ${varName}.filled = ${shapeComp.filled}`);
	lines.push(`        ${varName}.setPosition(${t.x - t.width * t.originX}f, ${t.y - t.height * t.originY}f)`);
	lines.push(`        ${varName}.setOrigin(${t.width * t.originX}f, ${t.height * t.originY}f)`);
	if (t.rotation !== 0) {
		lines.push(`        ${varName}.rotation = ${t.rotation}f`);
	}
	lines.push(`        stage.addActor(${varName})`);

	return lines;
}

function generateKotlinText(textComp: TextComponent, obj: GameObject, varName: string): string[] {
	const lines: string[] = [];
	const t = obj.transform;
	const c = hexToRgbaFloat(textComp.color);

	lines.push(`        val ${varName}Font = BitmapFont()`);
	lines.push(`        val ${varName} = LabelActor("${escapeJavaString(textComp.text)}", ${varName}Font)`);
	lines.push(`        ${varName}.textColor.set(${c.r}f, ${c.g}f, ${c.b}f, ${c.a}f)`);
	lines.push(`        ${varName}.setPosition(${t.x - t.width * t.originX}f, ${t.y - t.height * t.originY}f)`);
	lines.push(`        stage.addActor(${varName})`);

	return lines;
}

function generateKotlinAtlas(atlasProps: NonNullable<ReturnType<typeof getAtlasProperties>>, obj: GameObject, varName: string): string[] {
	const lines: string[] = [];
	const t = obj.transform;

	if (!atlasProps.atlasPath) {
		lines.push(`        val ${varName}Tex = assets.get("${atlasProps.texture}", Texture::class.java)`);
		lines.push(`        val ${varName} = Image(TextureRegionDrawable(TextureRegion(${varName}Tex)))`);
		lines.push(`        ${varName}.setSize(${t.width}f, ${t.height}f)`);
		lines.push(`        ${varName}.setPosition(${t.x - t.width * t.originX}f, ${t.y - t.height * t.originY}f)`);
		lines.push(`        stage.addActor(${varName})`);
		return lines;
	}

	lines.push(`        val ${varName}Atlas = assets.get("${atlasProps.atlasPath}", TextureAtlas::class.java)`);

	if (atlasProps.mode === "single" && atlasProps.region) {
		lines.push(`        val ${varName}Region = ${varName}Atlas.findRegion("${atlasProps.region}")`);
		lines.push(`        val ${varName} = Image(TextureRegionDrawable(${varName}Region))`);
		lines.push(`        ${varName}.setSize(${t.width}f, ${t.height}f)`);
		lines.push(`        ${varName}.setPosition(${t.x - t.width * t.originX}f, ${t.y - t.height * t.originY}f)`);
		lines.push(`        stage.addActor(${varName})`);
	} else if (atlasProps.mode === "grid") {
		lines.push(`        // Grid mode — TODO: implement grid slicing`);
		lines.push(`        val ${varName}Region = ${varName}Atlas.regions[${atlasProps.startIndex ?? 0}]`);
		lines.push(`        val ${varName} = Image(TextureRegionDrawable(${varName}Region))`);
		lines.push(`        ${varName}.setSize(${t.width}f, ${t.height}f)`);
		lines.push(`        stage.addActor(${varName})`);
	}

	return lines;
}

function generateKotlinAnimation(anim: AnimationComponent, obj: GameObject, varName: string): string[] {
	const lines: string[] = [];
	const t = obj.transform;

	lines.push(`        val ${varName}Atlas = assets.get("${anim.atlasPath}", TextureAtlas::class.java)`);
	lines.push(`        val ${varName}Anim = Animation<TextureRegion>(1f / ${anim.fps}f,`);

	const frameLines: string[] = [];
	for (const frame of anim.frames) {
		frameLines.push(`            ${varName}Atlas.findRegion("${frame}")`);
	}
	for (let i = 0; i < frameLines.length; i++) {
		const isLast = i === frameLines.length - 1;
		lines.push(frameLines[i] + (isLast ? "" : ","));
	}

	lines.push(`        )`);
	lines.push(`        ${varName}Anim.playMode = Animation.PlayMode.${anim.playMode}`);
	lines.push(`        val ${varName} = AnimatedActor(${varName}Anim)`);
	lines.push(`        ${varName}.setSize(${t.width}f, ${t.height}f)`);
	lines.push(`        ${varName}.setPosition(${t.x - t.width * t.originX}f, ${t.y - t.height * t.originY}f)`);
	lines.push(`        ${varName}.setOrigin(${t.width * t.originX}f, ${t.height * t.originY}f)`);
	lines.push(`        ${varName}.looping = ${anim.loop}`);
	lines.push(`        ${varName}.playing = ${anim.autoplay}`);
	lines.push(`        stage.addActor(${varName})`);

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

function escapeJavaString(s: string): string {
	return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");
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

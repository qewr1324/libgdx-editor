import type { Animation, Track, Keyframe, EasingType } from "./animatorConfig.js";

export interface AnimationCodeOptions {
	className: string;
	packageName?: string;
	language: "java" | "kotlin";
	includeComments: boolean;
}

export function generateAnimationCode(animation: Animation, options: AnimationCodeOptions): string {
	if (options.language === "java") {
		return generateJava(animation, options);
	}
	return generateKotlin(animation, options);
}

// ============================================================
// Java
// ============================================================

function generateJava(animation: Animation, options: AnimationCodeOptions): string {
	const { className, packageName, includeComments } = options;
	const lines: string[] = [];

	if (packageName) {
		lines.push(`package ${packageName};`);
		lines.push("");
	}

	lines.push(`import com.badlogic.gdx.scenes.scene2d.Actor;`);
	lines.push(`import com.badlogic.gdx.scenes.scene2d.actions.Actions;`);
	lines.push(`import com.badlogic.gdx.scenes.scene2d.actions.SequenceAction;`);
	lines.push(`import com.badlogic.gdx.math.Interpolation;`);
	lines.push("");

	if (includeComments) {
		lines.push(`/**`);
		lines.push(` * Auto-generated animation: ${animation.name}`);
		lines.push(` * Source scene: ${animation.sourceScene}`);
		lines.push(` * Duration: ${animation.duration}ms, FPS: ${animation.fps}, Loop: ${animation.loop}`);
		lines.push(` * Generated: ${new Date().toISOString()}`);
		lines.push(` */`);
	}

	lines.push(`public class ${className} {`);
	lines.push("");

	lines.push(`\tpublic static final float DURATION = ${animation.duration / 1000}f;`);
	lines.push(`\tpublic static final boolean LOOP = ${animation.loop};`);
	lines.push("");

	if (includeComments) {
		lines.push(`\t/**`);
		lines.push(`\t * Applies this animation to the given Actor.`);
		lines.push(`\t */`);
	}
	lines.push(`\tpublic static void apply(Actor target) {`);

	if (animation.tracks.length === 0) {
		lines.push(`\t\t// No tracks in this animation`);
		lines.push(`\t}`);
		lines.push(`}`);
		return lines.join("\n");
	}

	// ✅ گروه‌بندی track ها بر اساس property
	const allActions: string[] = [];
	for (const track of animation.tracks) {
		allActions.push(...generateJavaTrack(track, animation));
	}

	lines.push(`\t\tSequenceAction sequence = new SequenceAction();`);

	// اگه فقط یک track داریم، مستقیم اجرا کن
	if (animation.tracks.length === 1) {
		const track = animation.tracks[0];
		const action = buildJavaAction(track, animation);
		if (action) {
			if (animation.loop) {
				lines.push(`\t\tsequence.addAction(Actions.forever(${action}));`);
			} else {
				lines.push(`\t\tsequence.addAction(${action});`);
			}
			lines.push(`\t\ttarget.addAction(sequence);`);
		}
	} else {
		// چند track → با Actions.parallel
		const parallelActions = animation.tracks.map((t) => buildJavaAction(t, animation)).filter((a): a is string => a !== null);

		if (parallelActions.length > 0) {
			const joined = parallelActions.join(",\n\t\t\t");
			const parallel = `Actions.parallel(\n\t\t\t${joined}\n\t\t)`;
			if (animation.loop) {
				lines.push(`\t\tsequence.addAction(Actions.forever(${parallel}));`);
			} else {
				lines.push(`\t\tsequence.addAction(${parallel});`);
			}
			lines.push(`\t\ttarget.addAction(sequence);`);
		}
	}

	lines.push(`\t}`);
	lines.push(`}`);

	return lines.join("\n");
}

function generateJavaTrack(track: Track, animation: Animation): string[] {
	// اینجا فقط برای documentation — منطق اصلی در buildJavaAction
	return [`\t\t// Track: ${track.property} on ${track.objectId}`];
}

function buildJavaAction(track: Track, animation: Animation): string | null {
	const kfs = [...track.keyframes].sort((a, b) => a.time - b.time);
	if (kfs.length === 0) return null;

	const property = track.property;
	const actions: string[] = [];

	for (let i = 0; i < kfs.length - 1; i++) {
		const a = kfs[i];
		const b = kfs[i + 1];
		const duration = (b.time - a.time) / 1000;
		const interpolation = easingToInterpolation(b.easing);

		if (typeof a.value === "number" && typeof b.value === "number") {
			actions.push(buildNumericAction(property, a.value, b.value, duration, interpolation));
		}
	}

	if (actions.length === 0) return null;
	if (actions.length === 1) return actions[0];

	return `Actions.sequence(\n\t\t\t${actions.join(",\n\t\t\t")}\n\t\t)`;
}

function buildNumericAction(property: string, from: number, to: number, duration: number, interpolation: string): string {
	const f = formatNum(from);
	const t = formatNum(to);
	const d = formatNum(duration);

	switch (property) {
		case "transform.x":
			return `Actions.moveTo(${t}f, target.getY(), ${d}f, ${interpolation})`;
		case "transform.y":
			return `Actions.moveTo(target.getX(), ${t}f, ${d}f, ${interpolation})`;
		case "transform.width":
			return `Actions.sizeTo(${t}f, target.getHeight(), ${d}f, ${interpolation})`;
		case "transform.height":
			return `Actions.sizeTo(target.getWidth(), ${t}f, ${d}f, ${interpolation})`;
		case "transform.rotation":
			return `Actions.rotateTo(${t}f, ${d}f, ${interpolation})`;
		case "transform.scaleX":
			return `Actions.scaleTo(${t}f, target.getScaleY(), ${d}f, ${interpolation})`;
		case "transform.scaleY":
			return `Actions.scaleTo(target.getScaleX(), ${t}f, ${d}f, ${interpolation})`;
		case "opacity":
			return `Actions.alpha(${t}f, ${d}f, ${interpolation})`;
		default:
			return `/* Unsupported property: ${property} */`;
	}
}

// ============================================================
// Kotlin
// ============================================================

function generateKotlin(animation: Animation, options: AnimationCodeOptions): string {
	const { className, packageName, includeComments } = options;
	const lines: string[] = [];

	if (packageName) {
		lines.push(`package ${packageName}`);
		lines.push("");
	}

	lines.push(`import com.badlogic.gdx.scenes.scene2d.Actor`);
	lines.push(`import com.badlogic.gdx.scenes.scene2d.actions.Actions`);
	lines.push("");

	if (includeComments) {
		lines.push(`/**`);
		lines.push(` * Auto-generated animation: ${animation.name}`);
		lines.push(` * Source scene: ${animation.sourceScene}`);
		lines.push(` * Generated: ${new Date().toISOString()}`);
		lines.push(` */`);
	}

	lines.push(`object ${className} {`);
	lines.push("");
	lines.push(`    const val DURATION = ${animation.duration / 1000}f`);
	lines.push(`    const val LOOP = ${animation.loop}`);
	lines.push("");

	lines.push(`    fun apply(target: Actor) {`);
	lines.push(`        // TODO: implement animation actions`);
	lines.push(`    }`);
	lines.push(`}`);

	return lines.join("\n");
}

// ============================================================
// Helpers
// ============================================================

function easingToInterpolation(easing: EasingType): string {
	switch (easing) {
		case "linear":
			return "Interpolation.linear";
		case "easeIn":
			return "Interpolation.pow2In";
		case "easeOut":
			return "Interpolation.pow2Out";
		case "easeInOut":
			return "Interpolation.sine";
		case "step":
			return "Interpolation.linear";
		default:
			return "Interpolation.linear";
	}
}

function formatNum(n: number): string {
	if (Number.isInteger(n)) return String(n);
	return String(Math.round(n * 1000) / 1000);
}

function toPascalCase(s: string): string {
	return s
		.replace(/[^a-zA-Z0-9]+/g, " ")
		.trim()
		.split(/\s+/)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
		.join("");
}

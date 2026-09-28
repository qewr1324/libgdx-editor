import { Assets } from "pixi.js";
import type { Texture } from "pixi.js";
import { textureCache } from "../state.js";

export async function loadTexture(path: string, dataUrl: string): Promise<Texture> {
	if (textureCache.has(path)) return textureCache.get(path)!;
	const texture = await Assets.load<Texture>(dataUrl);
	textureCache.set(path, texture);
	return texture;
}

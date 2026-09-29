import { Assets } from "pixi.js";
import type { Texture } from "pixi.js";
import { setTexture } from "./scene-player.js";

export async function loadTexture(path: string, dataUrl: string): Promise<Texture> {
	const texture = await Assets.load<Texture>(dataUrl);
	setTexture(path, texture);
	return texture;
}

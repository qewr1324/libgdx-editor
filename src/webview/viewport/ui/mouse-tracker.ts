import { app, viewport, rulerInfo, setMouseWorld } from "../state.js";

export function setupMouseTracker(): void {
	app.canvas.addEventListener("mousemove", (e) => {
		if (!viewport) return;
		const rect = app.canvas.getBoundingClientRect();
		const world = viewport.toWorld(e.clientX - rect.left, e.clientY - rect.top);
		setMouseWorld(Math.round(world.x), Math.round(world.y));
		if (rulerInfo) {
			rulerInfo.textContent = `${Math.round(world.x)}, ${Math.round(world.y)}`;
		}
	});

	app.canvas.addEventListener("mouseleave", () => {
		if (rulerInfo) rulerInfo.textContent = "";
	});
}

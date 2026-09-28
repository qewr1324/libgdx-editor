import { viewport, scene, setRulerH, setRulerV, setRulerInfo, rulerH, rulerV } from "../state.js";

export function setupRulers(): void {
	const rh = document.createElement("canvas");
	rh.id = "ruler-h";
	rh.style.position = "fixed";
	rh.style.top = "0";
	rh.style.left = "0";
	rh.style.width = "100%";
	rh.style.height = "20px";
	rh.style.background = "var(--vscode-editorWidget-background)";
	rh.style.borderBottom = "1px solid var(--vscode-editorWidget-border)";
	rh.style.zIndex = "50";
	rh.style.pointerEvents = "none";
	document.body.appendChild(rh);
	setRulerH(rh);

	const rv = document.createElement("canvas");
	rv.id = "ruler-v";
	rv.style.position = "fixed";
	rv.style.top = "0";
	rv.style.left = "0";
	rv.style.width = "20px";
	rv.style.height = "100%";
	rv.style.background = "var(--vscode-editorWidget-background)";
	rv.style.borderRight = "1px solid var(--vscode-editorWidget-border)";
	rv.style.zIndex = "50";
	rv.style.pointerEvents = "none";
	document.body.appendChild(rv);
	setRulerV(rv);

	const info = document.createElement("div");
	info.id = "ruler-info";
	info.style.position = "fixed";
	info.style.bottom = "6px";
	info.style.right = "6px";
	info.style.padding = "2px 8px";
	info.style.background = "var(--vscode-editorWidget-background)";
	info.style.border = "1px solid var(--vscode-editorWidget-border)";
	info.style.borderRadius = "3px";
	info.style.fontSize = "11px";
	info.style.fontFamily = "monospace";
	info.style.color = "var(--vscode-descriptionForeground)";
	info.style.zIndex = "50";
	info.style.pointerEvents = "none";
	info.textContent = "0, 0";
	document.body.appendChild(info);
	setRulerInfo(info);

	drawRulers();
	window.addEventListener("resize", drawRulers);
	setInterval(drawRulers, 100);
}

export function drawRulers(): void {
	if (!rulerH || !rulerV || !viewport) return;

	const dpr = window.devicePixelRatio || 1;

	const hw = window.innerWidth;
	const hh = 20;
	rulerH.width = hw * dpr;
	rulerH.height = hh * dpr;
	const ctxH = rulerH.getContext("2d")!;
	ctxH.setTransform(1, 0, 0, 1, 0, 0);
	ctxH.scale(dpr, dpr);
	ctxH.clearRect(0, 0, hw, hh);

	const vw = 20;
	const vh = window.innerHeight;
	rulerV.width = vw * dpr;
	rulerV.height = vh * dpr;
	const ctxV = rulerV.getContext("2d")!;
	ctxV.setTransform(1, 0, 0, 1, 0, 0);
	ctxV.scale(dpr, dpr);
	ctxV.clearRect(0, 0, vw, vh);

	const textColor = getComputedStyle(document.body).color || "#888";
	const scale = viewport.scale.x;

	let step = 100;
	if (scene?.gridSize) step = scene.gridSize;
	while (step * scale < 40) step *= 2;
	while (step * scale > 200) step /= 2;

	const worldLeft = viewport.toWorld(20, 0).x;
	const worldRight = viewport.toWorld(hw, 0).x;
	const startX = Math.floor(worldLeft / step) * step;

	ctxH.fillStyle = textColor;
	ctxH.font = "9px monospace";
	ctxH.strokeStyle = textColor;
	ctxH.lineWidth = 1;

	for (let wx = startX; wx <= worldRight; wx += step) {
		const sx = viewport.toScreen(wx, 0).x;
		if (sx < 20 || sx > hw) continue;
		ctxH.beginPath();
		ctxH.moveTo(sx, hh - 6);
		ctxH.lineTo(sx, hh);
		ctxH.stroke();
		ctxH.fillText(String(wx), sx + 2, 10);
	}

	const worldTop = viewport.toWorld(0, 20).y;
	const worldBottom = viewport.toWorld(0, vh).y;
	const startY = Math.floor(worldTop / step) * step;

	ctxV.fillStyle = textColor;
	ctxV.font = "9px monospace";
	ctxV.strokeStyle = textColor;

	for (let wy = startY; wy <= worldBottom; wy += step) {
		const sy = viewport.toScreen(0, wy).y;
		if (sy < 20 || sy > vh) continue;
		ctxV.beginPath();
		ctxV.moveTo(vw - 6, sy);
		ctxV.lineTo(vw, sy);
		ctxV.stroke();
		ctxV.save();
		ctxV.translate(10, sy + 2);
		ctxV.rotate(-Math.PI / 2);
		ctxV.fillText(String(wy), 0, 0);
		ctxV.restore();
	}
}

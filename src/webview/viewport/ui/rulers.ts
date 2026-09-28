import { viewport, scene, setRulerH, setRulerV, setRulerInfo, rulerH, rulerV } from "../state.js";
import { getCurrentTheme } from "../theme/theme-manager.js";

export function setupRulers(): void {
	const rh = document.createElement("canvas");
	rh.id = "ruler-h";
	rh.style.position = "fixed";
	rh.style.top = "0";
	rh.style.left = "0";
	rh.style.width = "100%";
	rh.style.height = "20px";
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
	rv.style.zIndex = "50";
	rv.style.pointerEvents = "none";
	document.body.appendChild(rv);
	setRulerV(rv);

	const info = document.createElement("div");
	info.id = "ruler-info";
	info.style.position = "fixed";
	info.style.bottom = "4px";
	info.style.right = "4px";
	info.style.padding = "2px 8px";
	info.style.fontSize = "11px";
	info.style.fontFamily = "monospace";
	info.style.zIndex = "50";
	info.style.pointerEvents = "none";
	info.style.minWidth = "70px";
	info.textContent = "0, 0";
	document.body.appendChild(info);
	setRulerInfo(info);

	drawRulers();
	window.addEventListener("resize", drawRulers);
	setInterval(drawRulers, 100);

	// وقتی تم عوض شد، دوباره رسم کن
	window.addEventListener("theme-changed", () => {
		drawRulers();
	});
}

export function drawRulers(): void {
	if (!rulerH || !rulerV || !viewport) return;

	const theme = getCurrentTheme();
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

	// رنگ‌ها از تم جاری
	const bgColor = theme.bg;
	const textColor = theme.fg;
	const notchColor = theme.border;
	const borderLight = theme.borderLight;

	const isClassic = theme.isClassic === true;

	ctxH.fillStyle = bgColor;
	ctxH.fillRect(0, 0, hw, hh);

	ctxV.fillStyle = bgColor;
	ctxV.fillRect(0, 0, vw, vh);

	const scale = viewport.scale.x;

	let step = 100;
	if (scene?.gridSize) step = scene.gridSize;
	while (step * scale < 40) step *= 2;
	while (step * scale > 200) step /= 2;

	// خطوط افقی
	const worldLeft = viewport.toWorld(20, 0).x;
	const worldRight = viewport.toWorld(hw, 0).x;
	const startX = Math.floor(worldLeft / step) * step;

	ctxH.fillStyle = textColor;
	ctxH.font = `${isClassic ? "11px Tahoma, 'MS Sans Serif', sans-serif" : "10px " + theme.fontFamily}`;
	ctxH.strokeStyle = textColor;
	ctxH.lineWidth = 1;

	for (let wx = startX; wx <= worldRight; wx += step) {
		const sx = viewport.toScreen(wx, 0).x;
		if (sx < 20 || sx > hw - 2) continue;

		ctxH.beginPath();
		ctxH.moveTo(sx, hh - 8);
		ctxH.lineTo(sx, hh - 2);
		ctxH.stroke();

		for (let i = 1; i < 5; i++) {
			const subX = sx + (step * scale * i) / 5;
			if (subX > hw - 2) break;
			ctxH.beginPath();
			ctxH.moveTo(subX, hh - 4);
			ctxH.lineTo(subX, hh - 2);
			ctxH.stroke();
		}

		ctxH.fillText(String(wx), sx + 2, 10);
	}

	// خط جداکننده
	if (isClassic) {
		ctxH.fillStyle = borderLight;
		ctxH.fillRect(0, hh - 2, hw, 1);
		ctxH.fillStyle = notchColor;
		ctxH.fillRect(0, hh - 1, hw, 1);
	} else {
		ctxH.fillStyle = notchColor;
		ctxH.fillRect(0, hh - 1, hw, 1);
	}

	// خطوط عمودی
	const worldTop = viewport.toWorld(0, 20).y;
	const worldBottom = viewport.toWorld(0, vh).y;
	const startY = Math.floor(worldTop / step) * step;

	ctxV.fillStyle = textColor;
	ctxV.font = `${isClassic ? "11px Tahoma, 'MS Sans Serif', sans-serif" : "10px " + theme.fontFamily}`;
	ctxV.strokeStyle = textColor;

	for (let wy = startY; wy <= worldBottom; wy += step) {
		const sy = viewport.toScreen(0, wy).y;
		if (sy < 20 || sy > vh - 2) continue;

		ctxV.beginPath();
		ctxV.moveTo(vw - 8, sy);
		ctxV.lineTo(vw - 2, sy);
		ctxV.stroke();

		for (let i = 1; i < 5; i++) {
			const subY = sy + (step * scale * i) / 5;
			if (subY > vh - 2) break;
			ctxV.beginPath();
			ctxV.moveTo(vw - 4, subY);
			ctxV.lineTo(vw - 2, subY);
			ctxV.stroke();
		}

		ctxV.save();
		ctxV.translate(10, sy + 2);
		ctxV.rotate(-Math.PI / 2);
		ctxV.fillText(String(wy), 0, 0);
		ctxV.restore();
	}

	// خط جداکننده راست
	if (isClassic) {
		ctxV.fillStyle = borderLight;
		ctxV.fillRect(vw - 2, 0, 1, vh);
		ctxV.fillStyle = notchColor;
		ctxV.fillRect(vw - 1, 0, 1, vh);
	} else {
		ctxV.fillStyle = notchColor;
		ctxV.fillRect(vw - 1, 0, 1, vh);
	}
}

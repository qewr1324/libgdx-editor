// src/webview/inspector/utils.ts

export function escapeHtml(s: string): string {
	return s.replace(/[&<>"']/g, (c) => {
		return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!;
	});
}

export function escapeAttr(s: string): string {
	return escapeHtml(s);
}

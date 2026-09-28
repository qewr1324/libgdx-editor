interface VsCodeApi {
	postMessage(msg: unknown): void;
	getState(): unknown;
	setState(state: unknown): void;
}
declare function acquireVsCodeApi(): VsCodeApi;

const vscode = acquireVsCodeApi();
const app = document.getElementById("app")!;

let selectedId: string | null = null;

function render(): void {
	if (!selectedId) {
		app.innerHTML = `
      <div style="padding:16px;color:var(--vscode-descriptionForeground);">
        No object selected.
      </div>
    `;
		return;
	}
	app.innerHTML = `
    <div style="padding:16px;">
      <h3 style="margin-top:0;">Selected: ${selectedId}</h3>
    </div>
  `;
}

window.addEventListener("message", (event) => {
	const msg = event.data;
	if (msg.type === "selectObject") {
		selectedId = msg.objectId;
		render();
	}
});

render();
vscode.postMessage({ type: "ready" });

interface VsCodeApi {
	postMessage(msg: unknown): void;
	getState(): unknown;
	setState(state: unknown): void;
}
declare function acquireVsCodeApi(): VsCodeApi;

const vscode = acquireVsCodeApi();

const app = document.getElementById("app")!;
app.innerHTML = `
  <div style="
    display:flex;align-items:center;justify-content:center;
    width:100vw;height:100vh;
    color:var(--vscode-foreground);
    background:var(--vscode-editor-background);
    font-family:var(--vscode-font-family);
  ">
    <h1>🎮 LibGDX Editor Viewport</h1>
  </div>
`;

// اعلام آمادگی به extension
vscode.postMessage({ type: "ready" });

window.addEventListener("message", (event) => {
	const msg = event.data;
	console.log("viewport received:", msg);
});

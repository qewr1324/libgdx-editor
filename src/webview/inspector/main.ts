// src/webview/inspector/main.ts
import { vscode } from "./vscode-api.js";
import { setupMessages } from "./messages.js";
import { render } from "./render/index.js";

setupMessages();
render(true);

vscode.postMessage({ type: "inspectorReady" });
vscode.postMessage({ type: "requestConfig" });

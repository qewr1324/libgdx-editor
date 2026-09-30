// src/webview/components/main.ts
import { vscode } from "./vscode-api.js";
import { setupMessages } from "./messages.js";
import { render } from "./render.js";

setupMessages();
render(true);

vscode.postMessage({ type: "componentsReady" });
vscode.postMessage({ type: "requestConfig" });

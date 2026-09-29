// src/webview/inspector/main.ts
import { vscode } from "./vscode-api.js";
import { setupMessages } from "./messages.js";
import { render } from "./render/index.js";

// راه‌اندازی listener پیام‌ها
setupMessages();

// رندر اولیه
render(true);

// به extension بگو آماده‌ایم
vscode.postMessage({ type: "inspectorReady" });
vscode.postMessage({ type: "requestConfig" });

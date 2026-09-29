// src/webview/layers/styles.ts
export const LAYERS_CSS = ` * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

html,
body,
#app {
    width: 100%;
    height: 100%;
    overflow: hidden;
    font-family: var(--vscode-font-family, system-ui, -apple-system, sans-serif);
    font-size: var(--vscode-font-size, 13px);
    color: var(--vscode-foreground, #cccccc);
    background: var(--vscode-sideBar-background, #1e1e1e);
}

/* ============ Panel ============ */

.layers-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
}

/* ============ Toolbar ============ */

.layers-toolbar {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px 6px;
    min-height: 30px;
    border-bottom: 1px solid var(--vscode-panel-border, rgba(128, 128, 128, 0.35));
    background: var(--vscode-sideBar-background, transparent);
    user-select: none;
}

.layers-toolbar-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--vscode-icon-foreground, currentColor);
    cursor: pointer;
    width: 22px;
    height: 22px;
    border-radius: 4px;
    padding: 0;
    opacity: 0.8;
    transition: background 0.08s ease, opacity 0.08s ease;
}

.layers-toolbar-btn:hover:not(:disabled) {
    background: var(--vscode-toolbar-hoverBackground, rgba(255, 255, 255, 0.1));
    opacity: 1;
}

.layers-toolbar-btn:active:not(:disabled) {
    background: var(--vscode-toolbar-activeBackground, rgba(255, 255, 255, 0.15));
}

.layers-toolbar-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

.layers-toolbar-btn svg {
    display: block;
}

.layers-count {
    margin-left: auto;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.5;
    padding: 0 4px;
}

/* ============ Layers List ============ */

.layers-list {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 2px 0;
}

.layers-list::-webkit-scrollbar {
    width: 10px;
}

.layers-list::-webkit-scrollbar-track {
    background: transparent;
}

.layers-list::-webkit-scrollbar-thumb {
    background: var(--vscode-scrollbarSlider-background, rgba(121, 121, 121, 0.4));
    border-radius: 5px;
    border: 2px solid transparent;
    background-clip: padding-box;
}

.layers-list::-webkit-scrollbar-thumb:hover {
    background: var(--vscode-scrollbarSlider-hoverBackground, rgba(100, 100, 100, 0.7));
    background-clip: padding-box;
}

/* ============ Layer Item ============ */

.layer-item {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 3px 6px 3px 2px;
    margin: 0;
    min-height: 24px;
    cursor: pointer;
    user-select: none;
    position: relative;
    border-left: 2px solid transparent;
    transition: background 0.06s ease;
}

.layer-item:hover {
    background: var(--vscode-list-hoverBackground, rgba(255, 255, 255, 0.06));
}

.layer-item.selected {
    background: var(--vscode-list-activeSelectionBackground, #094771);
    color: var(--vscode-list-activeSelectionForeground, #ffffff);
    border-left-color: var(--vscode-focusBorder, #007acc);
}

.layer-item.selected .layer-icon-btn {
    color: var(--vscode-list-activeSelectionForeground, #ffffff);
    opacity: 0.85;
}

.layer-item.selected .layer-obj-count {
    background: rgba(255, 255, 255, 0.2);
    color: var(--vscode-list-activeSelectionForeground, #ffffff);
}

.layer-item.is-hidden .layer-name-text {
    opacity: 0.4;
    text-decoration: line-through;
}

.layer-item.is-locked .layer-name-text {
    font-style: italic;
    opacity: 0.75;
}

.layer-item.dragging {
    opacity: 0.35;
}

.layer-item.drag-over {
    border-top: 2px solid var(--vscode-focusBorder, #007acc);
    padding-top: 1px;
}

/* ============ Grip ============ */

.layer-grip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 100%;
    flex-shrink: 0;
    cursor: grab;
    opacity: 0;
    color: var(--vscode-icon-foreground, currentColor);
    transition: opacity 0.1s ease;
}

.layer-item:hover .layer-grip,
.layer-item.selected .layer-grip {
    opacity: 0.5;
}

.layer-grip:active {
    cursor: grabbing;
}

/* ============ Icon Buttons ============ */

.layer-icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    background: transparent;
    border: none;
    color: var(--vscode-icon-foreground, currentColor);
    cursor: pointer;
    border-radius: 3px;
    padding: 0;
    opacity: 0.65;
    transition: background 0.08s ease, opacity 0.08s ease;
}

.layer-icon-btn:hover {
    opacity: 1;
    background: var(--vscode-toolbar-hoverBackground, rgba(255, 255, 255, 0.12));
}

.layer-icon-btn.small {
    width: 18px;
    height: 18px;
    opacity: 0.45;
}

.layer-item:hover .layer-icon-btn.small,
.layer-item.selected .layer-icon-btn.small {
    opacity: 0.75;
}

.layer-icon-btn svg {
    display: block;
    pointer-events: none;
}

/* ============ Layer Name ============ */

.layer-name {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 1px 4px;
    overflow: hidden;
}

.layer-name-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
}

.layer-name input {
    width: 100%;
    background: var(--vscode-input-background, #3c3c3c);
    color: var(--vscode-input-foreground, #cccccc);
    border: 1px solid var(--vscode-focusBorder, #007acc);
    padding: 1px 4px;
    font-family: inherit;
    font-size: inherit;
    outline: none;
    border-radius: 2px;
    height: 18px;
}

.layer-obj-count {
    font-size: 9px;
    font-weight: 600;
    opacity: 0.7;
    background: var(--vscode-badge-background, rgba(255, 255, 255, 0.1));
    color: var(--vscode-badge-foreground, inherit);
    padding: 0 5px;
    border-radius: 8px;
    min-width: 18px;
    text-align: center;
    line-height: 14px;
    height: 14px;
    flex-shrink: 0;
}

/* ============ Actions ============ */

.layer-actions {
    display: flex;
    flex-direction: column;
    gap: 0;
    flex-shrink: 0;
}

.layer-actions .layer-icon-btn {
    height: 11px;
    width: 18px;
}

.layer-actions .layer-icon-btn svg {
    width: 10px;
    height: 10px;
}

/* ============ Empty ============ */

.layers-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 20px;
    text-align: center;
    gap: 8px;
    opacity: 0.6;
}

.layers-empty-icon {
    color: var(--vscode-icon-foreground, currentColor);
    opacity: 0.4;
}

.layers-empty-icon svg {
    width: 28px;
    height: 28px;
}

.layers-empty-title {
    font-size: 12px;
    font-weight: 500;
    margin-bottom: 4px;
}

.layers-empty-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: var(--vscode-button-background, #0e639c);
    color: var(--vscode-button-foreground, #ffffff);
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
}

.layers-empty-btn:hover {
    background: var(--vscode-button-hoverBackground, #1177bb);
}

.layers-empty-btn svg {
    display: block;
}

`;

export function injectStyles(): void {
	const style = document.createElement("style");
	style.id = "layers-styles";
	style.textContent = LAYERS_CSS;
	document.head.appendChild(style);
}

export interface Theme {
	name: string;
	label: string;

	// رنگ‌های کلی
	bg: string;
	fg: string;
	border: string;
	borderLight: string;
	borderDark: string;

	// Panel
	panelBg: string;
	panelBorder: string;
	panelRadius: string;

	// Button
	btnBg: string;
	btnFg: string;
	btnBorder: string;
	btnHoverBg: string;
	btnActiveBg: string;
	btnRadius: string;
	btnPadding: string;
	btnFontWeight: string;
	btnTextTransform: string;
	btnBoxShadow: string;
	btnActiveBoxShadow: string;

	// Input
	inputBg: string;
	inputFg: string;
	inputBorder: string;
	inputFocusBorder: string;
	inputRadius: string;
	inputPadding: string;

	// Font
	fontFamily: string;
	fontSize: string;
	fontWeight: string;

	// Title bar
	titleBg: string;
	titleFg: string;

	// Accent
	accent: string;
	accentFg: string;

	// Toolbar
	toolbarBg: string;
	toolbarBorder: string;
	toolbarRadius: string;
	toolbarShadow: string;
	toolbarPadding: string;
	toolbarGap: string;

	// Context menu
	menuBg: string;
	menuFg: string;
	menuHoverBg: string;
	menuHoverFg: string;
	menuBorder: string;
	menuRadius: string;
	menuShadow: string;

	// Scrollbar
	scrollTrack: string;
	scrollThumb: string;
	scrollThumbBorder: string;
}

export const THEMES: Record<string, Theme> = {
	win98: {
		name: "win98",
		label: "Windows 98",
		bg: "#c0c0c0",
		fg: "#000000",
		border: "#808080",
		borderLight: "#ffffff",
		borderDark: "#404040",
		panelBg: "#c0c0c0",
		panelBorder: "#808080",
		panelRadius: "0",
		btnBg: "#c0c0c0",
		btnFg: "#000000",
		btnBorder: "#808080",
		btnHoverBg: "#c0c0c0",
		btnActiveBg: "#c0c0c0",
		btnRadius: "0",
		btnPadding: "3px 10px",
		btnFontWeight: "normal",
		btnTextTransform: "none",
		btnBoxShadow: "inset -1px -1px 0 #808080, inset 1px 1px 0 #dfdfdf",
		btnActiveBoxShadow: "inset 1px 1px 0 #808080",
		inputBg: "#ffffff",
		inputFg: "#000000",
		inputBorder: "#808080",
		inputFocusBorder: "#000080",
		inputRadius: "0",
		inputPadding: "3px 6px",
		fontFamily: "Tahoma, 'MS Sans Serif', sans-serif",
		fontSize: "11px",
		fontWeight: "normal",
		titleBg: "linear-gradient(90deg, #000080, #1084d0)",
		titleFg: "#ffffff",
		accent: "#000080",
		accentFg: "#ffffff",
		toolbarBg: "#c0c0c0",
		toolbarBorder: "#808080",
		toolbarRadius: "0",
		toolbarShadow: "inset -1px -1px 0 #808080, inset 1px 1px 0 #dfdfdf",
		toolbarPadding: "3px",
		toolbarGap: "2px",
		menuBg: "#c0c0c0",
		menuFg: "#000000",
		menuHoverBg: "#000080",
		menuHoverFg: "#ffffff",
		menuBorder: "#808080",
		menuRadius: "0",
		menuShadow: "2px 2px 4px rgba(0,0,0,0.4)",
		scrollTrack: "#dfdfdf",
		scrollThumb: "#c0c0c0",
		scrollThumbBorder: "#808080",
	},

	unity5: {
		name: "unity5",
		label: "Unity 5",
		bg: "#3c3c3c",
		fg: "#d4d4d4",
		border: "#2a2a2a",
		borderLight: "#5a5a5a",
		borderDark: "#1a1a1a",
		panelBg: "#383838",
		panelBorder: "#2a2a2a",
		panelRadius: "3px",
		btnBg: "#4a4a4a",
		btnFg: "#d4d4d4",
		btnBorder: "#2a2a2a",
		btnHoverBg: "#555555",
		btnActiveBg: "#2d5d8f",
		btnRadius: "3px",
		btnPadding: "4px 10px",
		btnFontWeight: "normal",
		btnTextTransform: "none",
		btnBoxShadow: "none",
		btnActiveBoxShadow: "inset 0 0 0 1px #4a90e2",
		inputBg: "#2b2b2b",
		inputFg: "#d4d4d4",
		inputBorder: "#1a1a1a",
		inputFocusBorder: "#4a90e2",
		inputRadius: "3px",
		inputPadding: "3px 6px",
		fontFamily: "'Lucida Grande', 'Segoe UI', sans-serif",
		fontSize: "11px",
		fontWeight: "normal",
		titleBg: "linear-gradient(180deg, #4a4a4a, #383838)",
		titleFg: "#d4d4d4",
		accent: "#4a90e2",
		accentFg: "#ffffff",
		toolbarBg: "linear-gradient(180deg, #4a4a4a, #3a3a3a)",
		toolbarBorder: "#2a2a2a",
		toolbarRadius: "3px",
		toolbarShadow: "0 1px 2px rgba(0,0,0,0.4)",
		toolbarPadding: "4px",
		toolbarGap: "4px",
		menuBg: "#3c3c3c",
		menuFg: "#d4d4d4",
		menuHoverBg: "#4a90e2",
		menuHoverFg: "#ffffff",
		menuBorder: "#2a2a2a",
		menuRadius: "3px",
		menuShadow: "0 2px 8px rgba(0,0,0,0.6)",
		scrollTrack: "#2b2b2b",
		scrollThumb: "#4a4a4a",
		scrollThumbBorder: "#2a2a2a",
	},

	unity6: {
		name: "unity6",
		label: "Unity 6",
		bg: "#282828",
		fg: "#e0e0e0",
		border: "#1e1e1e",
		borderLight: "#3a3a3a",
		borderDark: "#141414",
		panelBg: "#2d2d2d",
		panelBorder: "#1e1e1e",
		panelRadius: "4px",
		btnBg: "#3a3a3a",
		btnFg: "#e0e0e0",
		btnBorder: "#1e1e1e",
		btnHoverBg: "#454545",
		btnActiveBg: "#2d5d8f",
		btnRadius: "4px",
		btnPadding: "4px 12px",
		btnFontWeight: "500",
		btnTextTransform: "none",
		btnBoxShadow: "none",
		btnActiveBoxShadow: "inset 0 0 0 1px #00a3ff",
		inputBg: "#1e1e1e",
		inputFg: "#e0e0e0",
		inputBorder: "#141414",
		inputFocusBorder: "#00a3ff",
		inputRadius: "4px",
		inputPadding: "4px 8px",
		fontFamily: "'Inter', 'Segoe UI', sans-serif",
		fontSize: "11px",
		fontWeight: "normal",
		titleBg: "linear-gradient(180deg, #383838, #2d2d2d)",
		titleFg: "#e0e0e0",
		accent: "#00a3ff",
		accentFg: "#ffffff",
		toolbarBg: "linear-gradient(180deg, #383838, #2d2d2d)",
		toolbarBorder: "#1e1e1e",
		toolbarRadius: "4px",
		toolbarShadow: "0 1px 3px rgba(0,0,0,0.5)",
		toolbarPadding: "5px",
		toolbarGap: "4px",
		menuBg: "#2d2d2d",
		menuFg: "#e0e0e0",
		menuHoverBg: "#00a3ff",
		menuHoverFg: "#ffffff",
		menuBorder: "#1e1e1e",
		menuRadius: "4px",
		menuShadow: "0 2px 10px rgba(0,0,0,0.7)",
		scrollTrack: "#1e1e1e",
		scrollThumb: "#3a3a3a",
		scrollThumbBorder: "#1e1e1e",
	},

	ue4: {
		name: "ue4",
		label: "Unreal Engine 4",
		bg: "#1e1e1e",
		fg: "#c8c8c8",
		border: "#0d0d0d",
		borderLight: "#3a3a3a",
		borderDark: "#000000",
		panelBg: "#252525",
		panelBorder: "#0d0d0d",
		panelRadius: "2px",
		btnBg: "#2c2c2c",
		btnFg: "#c8c8c8",
		btnBorder: "#0d0d0d",
		btnHoverBg: "#3a3a3a",
		btnActiveBg: "#0070e0",
		btnRadius: "2px",
		btnPadding: "4px 10px",
		btnFontWeight: "normal",
		btnTextTransform: "none",
		btnBoxShadow: "none",
		btnActiveBoxShadow: "inset 0 0 0 1px #00b0ff",
		inputBg: "#151515",
		inputFg: "#c8c8c8",
		inputBorder: "#0d0d0d",
		inputFocusBorder: "#0070e0",
		inputRadius: "2px",
		inputPadding: "3px 6px",
		fontFamily: "'Roboto', 'Segoe UI', sans-serif",
		fontSize: "11px",
		fontWeight: "normal",
		titleBg: "linear-gradient(180deg, #2c2c2c, #1e1e1e)",
		titleFg: "#c8c8c8",
		accent: "#0070e0",
		accentFg: "#ffffff",
		toolbarBg: "linear-gradient(180deg, #2c2c2c, #1e1e1e)",
		toolbarBorder: "#0d0d0d",
		toolbarRadius: "2px",
		toolbarShadow: "0 1px 2px rgba(0,0,0,0.6)",
		toolbarPadding: "4px",
		toolbarGap: "3px",
		menuBg: "#252525",
		menuFg: "#c8c8c8",
		menuHoverBg: "#0070e0",
		menuHoverFg: "#ffffff",
		menuBorder: "#0d0d0d",
		menuRadius: "2px",
		menuShadow: "0 2px 8px rgba(0,0,0,0.8)",
		scrollTrack: "#151515",
		scrollThumb: "#2c2c2c",
		scrollThumbBorder: "#0d0d0d",
	},

	ue5: {
		name: "ue5",
		label: "Unreal Engine 5",
		bg: "#151515",
		fg: "#d0d0d0",
		border: "#0a0a0a",
		borderLight: "#353535",
		borderDark: "#000000",
		panelBg: "#1f1f1f",
		panelBorder: "#0a0a0a",
		panelRadius: "3px",
		btnBg: "#262626",
		btnFg: "#d0d0d0",
		btnBorder: "#0a0a0a",
		btnHoverBg: "#353535",
		btnActiveBg: "#0084ff",
		btnRadius: "3px",
		btnPadding: "5px 12px",
		btnFontWeight: "500",
		btnTextTransform: "none",
		btnBoxShadow: "0 1px 2px rgba(0,0,0,0.5)",
		btnActiveBoxShadow: "inset 0 0 0 1px #00b0ff, 0 0 8px rgba(0,132,255,0.4)",
		inputBg: "#0f0f0f",
		inputFg: "#d0d0d0",
		inputBorder: "#0a0a0a",
		inputFocusBorder: "#0084ff",
		inputRadius: "3px",
		inputPadding: "4px 8px",
		fontFamily: "'Inter', 'Segoe UI', sans-serif",
		fontSize: "11px",
		fontWeight: "normal",
		titleBg: "linear-gradient(180deg, #2a2a2a, #1a1a1a)",
		titleFg: "#d0d0d0",
		accent: "#0084ff",
		accentFg: "#ffffff",
		toolbarBg: "linear-gradient(180deg, #2a2a2a, #1a1a1a)",
		toolbarBorder: "#0a0a0a",
		toolbarRadius: "3px",
		toolbarShadow: "0 1px 3px rgba(0,0,0,0.7), 0 0 12px rgba(0,132,255,0.08)",
		toolbarPadding: "5px",
		toolbarGap: "4px",
		menuBg: "#1f1f1f",
		menuFg: "#d0d0d0",
		menuHoverBg: "#0084ff",
		menuHoverFg: "#ffffff",
		menuBorder: "#0a0a0a",
		menuRadius: "3px",
		menuShadow: "0 4px 16px rgba(0,0,0,0.9), 0 0 8px rgba(0,132,255,0.15)",
		scrollTrack: "#0f0f0f",
		scrollThumb: "#262626",
		scrollThumbBorder: "#0a0a0a",
	},
};

export const THEME_ORDER: string[] = ["win98", "unity5", "unity6", "ue4", "ue5"];

export const DEFAULT_THEME = "win98";

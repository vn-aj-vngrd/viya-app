/**
 * Viya design tokens. Single source of truth for the TypeScript side; the same
 * canvas/surface/ink values are mirrored as CSS variables in global.css so
 * HeroUI Native and className utilities follow the same light/dark palette.
 */

export type ColorSchemeName = "light" | "dark";

export interface Palette {
	/** Primary brand/tint color: links, selection, AI guidance. */
	accent: string;
	/** Page background. Never pure white. */
	canvas: string;
	danger: string;
	/** Quiet fill for chips, inactive controls and nested tiles. */
	fill: string;
	/** Opaque or near-opaque fallback for glass when glass is unavailable. */
	glassFallback: string;
	/** Hairline on glass edges and dividers. */
	hairline: string;
	/** Primary text, icons, primary button fill. */
	ink: string;
	inkSecondary: string;
	inkTertiary: string;
	/** Text/icon on a primary (ink) fill. */
	onPrimary: string;
	scrim: string;
	/** Selected segment / tab selection pill. */
	selection: string;
	separator: string;
	success: string;
	/** Opaque content surface (cards, rows, fields). */
	surface: string;
	warning: string;
}

export const palettes: Record<ColorSchemeName, Palette> = {
	light: {
		accent: "#0A84FF",
		canvas: "#F4F4F5",
		danger: "#D70015",
		fill: "#EEEEF0",
		glassFallback: "rgba(255,255,255,0.92)",
		hairline: "rgba(24,24,27,0.10)",
		ink: "#18181B",
		inkSecondary: "#6B6B73",
		inkTertiary: "#A1A1AA",
		onPrimary: "#FFFFFF",
		scrim: "rgba(0,0,0,0.38)",
		selection: "#E6E6EA",
		separator: "rgba(24,24,27,0.08)",
		success: "#248A3D",
		surface: "#FFFFFF",
		warning: "#B25E00",
	},
	dark: {
		accent: "#0A84FF",
		canvas: "#0B0B0C",
		danger: "#FF453A",
		fill: "#2C2C2E",
		glassFallback: "rgba(44,44,46,0.94)",
		hairline: "rgba(255,255,255,0.14)",
		ink: "#F5F5F7",
		inkSecondary: "#A1A1AA",
		inkTertiary: "#71717A",
		onPrimary: "#18181B",
		scrim: "rgba(0,0,0,0.6)",
		selection: "#3A3A3C",
		separator: "rgba(255,255,255,0.10)",
		success: "#30D158",
		surface: "#1C1C1E",
		warning: "#FF9F0A",
	},
};

/** 4pt scale with semantic aliases. */
export const spacing = {
	"2xl": 32,
	"3xl": 40,
	lg: 16,
	md: 12,
	screen: 20,
	section: 24,
	sm: 8,
	xl: 24,
	xs: 4,
} as const;

export const radius = {
	card: 20,
	field: 16,
	group: 14,
	pill: 999,
	sheet: 32,
	tile: 12,
} as const;

/** Control metrics (pt). Hit targets are never below `minTarget`. */
export const metrics = {
	actionHeight: 50,
	chipHeight: 34,
	iconButton: 44,
	minTarget: 44,
	navBarHeight: 44,
	rowHeight: 54,
	segmentHeight: 32,
	swipeAction: 76,
	tabBarHeight: 60,
	tabSlot: 52,
	thumbnail: 56,
} as const;

export type TypeVariant =
	| "largeTitle"
	| "title"
	| "heading"
	| "headline"
	| "body"
	| "callout"
	| "subhead"
	| "footnote"
	| "eyebrow";

interface TypeStyle {
	fontSize: number;
	fontWeight: "400" | "500" | "600" | "700";
	letterSpacing?: number;
	lineHeight: number;
}

/** iOS-like type scale; system font, scales with Dynamic Type. */
export const typeScale: Record<TypeVariant, TypeStyle> = {
	body: { fontSize: 17, fontWeight: "400", lineHeight: 24 },
	callout: { fontSize: 16, fontWeight: "400", lineHeight: 22 },
	eyebrow: {
		fontSize: 12,
		fontWeight: "600",
		letterSpacing: 0.5,
		lineHeight: 16,
	},
	footnote: { fontSize: 13, fontWeight: "400", lineHeight: 18 },
	heading: { fontSize: 22, fontWeight: "600", lineHeight: 28 },
	headline: { fontSize: 17, fontWeight: "600", lineHeight: 22 },
	largeTitle: {
		fontSize: 34,
		fontWeight: "700",
		letterSpacing: 0.3,
		lineHeight: 41,
	},
	subhead: { fontSize: 15, fontWeight: "400", lineHeight: 20 },
	title: { fontSize: 28, fontWeight: "700", lineHeight: 34 },
};

export const motion = {
	/** Durations in ms. */
	duration: { fast: 120, normal: 220, toast: 2800 },
	/** Distance (pt) content rises while entering. */
	riseDistance: 8,
	/** Reanimated spring configs. Two springs only, both without bounce. */
	spring: {
		/** Layout, entering, progress, selection: critically damped, ~300ms. */
		layout: { damping: 35, mass: 1, stiffness: 300 },
		/** Press feedback: fast, no overshoot. */
		press: { damping: 32, mass: 0.6, stiffness: 500 },
	},
	/** List entrance: max 40ms stagger, first 6 items only. */
	stagger: { max: 40, maxItems: 6 },
	pressScale: 0.97,
	rowPressScale: 0.985,
} as const;

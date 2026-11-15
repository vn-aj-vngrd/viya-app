import { Ionicons } from "@expo/vector-icons";
import { type SFSymbol, SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import { Platform, type StyleProp, type ViewStyle } from "react-native";

import { useUITheme } from "./use-ui-theme";

/** Canonical icon names are Ionicons names (also the Android glyph set). */
export type IconName = ComponentProps<typeof Ionicons>["name"];

export type IconTone =
	| "primary"
	| "secondary"
	| "tertiary"
	| "accent"
	| "danger"
	| "success"
	| "warning"
	| "onPrimary";

export type IconWeight =
	| "ultraLight"
	| "thin"
	| "light"
	| "regular"
	| "medium"
	| "semibold"
	| "bold";

/**
 * SF Symbols used on iOS for every icon the app uses. One source of truth for
 * the name map. A name missing here falls back to the Ionicons glyph, so add
 * the SF Symbol here whenever a new icon name enters the app.
 */
export const SF_SYMBOL_MAP: Partial<Record<IconName, SFSymbol>> = {
	add: "plus",
	"add-circle-outline": "plus.circle",
	"add-outline": "plus",
	airplane: "airplane",
	"alert-circle": "exclamationmark.circle.fill",
	"alert-circle-outline": "exclamationmark.circle",
	"information-circle": "info.circle.fill",
	"information-circle-outline": "info.circle",
	"archive-outline": "archivebox",
	"arrow-forward": "arrow.right",
	"arrow-up": "arrow.up",
	"bookmark-outline": "bookmark",
	briefcase: "briefcase.fill",
	"briefcase-outline": "briefcase",
	"calendar-clear-outline": "calendar",
	"calendar-number-outline": "calendar",
	"calendar-outline": "calendar",
	"call-outline": "phone",
	camera: "camera.fill",
	"card-outline": "creditcard",
	"cash-outline": "banknote",
	"chatbubble-outline": "bubble.left",
	"checkbox-outline": "checkmark.square",
	checkmark: "checkmark",
	"checkmark-circle": "checkmark.circle.fill",
	"checkmark-circle-outline": "checkmark.circle",
	"checkmark-done-outline": "checklist",
	"checkmark-outline": "checkmark",
	"checkmark-sharp": "checkmark",
	"chevron-back": "chevron.left",
	"chevron-down": "chevron.down",
	"chevron-forward": "chevron.right",
	"chevron-up": "chevron.up",
	close: "xmark",
	"cloud-upload-outline": "icloud.and.arrow.up",
	"compass-outline": "safari",
	"create-outline": "square.and.pencil",
	"document-attach-outline": "paperclip",
	"document-outline": "doc",
	"document-text-outline": "doc.text",
	"documents-outline": "doc.on.doc",
	"ellipse-outline": "circle",
	"ellipsis-horizontal": "ellipsis",
	"expand-outline": "arrow.up.left.and.arrow.down.right",
	"file-tray-full-outline": "tray.full",
	"flag-outline": "flag",
	flash: "bolt.fill",
	"folder-open-outline": "folder",
	"git-branch-outline": "arrow.triangle.branch",
	heart: "heart.fill",
	home: "house.fill",
	"image-outline": "photo",
	"images-outline": "photo.on.rectangle",
	"layers-outline": "square.stack.3d.up",
	"link-outline": "link",
	"list-outline": "list.bullet",
	location: "location.fill",
	"location-outline": "mappin.and.ellipse",
	"log-out": "rectangle.portrait.and.arrow.right",
	"mail-outline": "envelope",
	map: "map.fill",
	"map-outline": "map",
	moon: "moon.fill",
	"navigate-outline": "location",
	"open-outline": "arrow.up.right.square",
	"options-outline": "slider.horizontal.3",
	"partly-sunny-outline": "cloud.sun",
	"pencil-outline": "pencil",
	"people-outline": "person.2",
	"person-add-outline": "person.badge.plus",
	"person-circle-outline": "person.crop.circle",
	"person-outline": "person",
	"pie-chart-outline": "chart.pie",
	"pin-outline": "pin",
	"play-circle-outline": "play.circle",
	"play-forward-outline": "forward",
	"pricetag-outline": "tag",
	"reader-outline": "text.book.closed",
	"receipt-outline": "receipt",
	"remove-circle-outline": "minus.circle",
	"return-down-forward": "arrow.turn.down.right",
	search: "magnifyingglass",
	"search-outline": "magnifyingglass",
	"share-outline": "square.and.arrow.up",
	"share-social-outline": "square.and.arrow.up",
	"shield-checkmark-outline": "checkmark.shield",
	sparkles: "sparkles",
	"sparkles-outline": "sparkles",
	"speedometer-outline": "speedometer",
	"star-outline": "star",
	"ticket-outline": "ticket",
	"time-outline": "clock",
	"trash-outline": "trash",
	"wallet-outline": "wallet.pass",
	warning: "exclamationmark.triangle.fill",
	"warning-outline": "exclamationmark.triangle",
};

export interface IconProps {
	/** Explicit colour; wins over `tone`. */
	color?: string;
	name: IconName;
	size?: number;
	style?: StyleProp<ViewStyle>;
	/** Semantic colour from the palette. Default "primary". */
	tone?: IconTone;
	weight?: IconWeight;
}

/**
 * The only way to draw an icon. Monochrome SF Symbols on iOS, Ionicons on
 * Android/web. Decorative by default (hidden from screen readers); label the
 * parent control instead.
 */
export function Icon({
	color,
	name,
	size = 20,
	style,
	tone = "primary",
	weight = "regular",
}: IconProps) {
	const { palette } = useUITheme();
	const tones: Record<IconTone, string> = {
		accent: palette.accent,
		danger: palette.danger,
		onPrimary: palette.onPrimary,
		primary: palette.ink,
		secondary: palette.inkSecondary,
		success: palette.success,
		tertiary: palette.inkTertiary,
		warning: palette.warning,
	};
	const tint = color ?? tones[tone];
	const symbol = SF_SYMBOL_MAP[name];

	if (Platform.OS === "ios" && symbol) {
		return (
			<SymbolView
				accessibilityElementsHidden
				importantForAccessibility="no-hide-descendants"
				name={symbol}
				resizeMode="scaleAspectFit"
				style={[{ height: size, width: size }, style]}
				tintColor={tint}
				type="monochrome"
				weight={weight}
			/>
		);
	}

	return (
		<Ionicons
			accessibilityElementsHidden
			color={tint}
			name={name}
			size={size}
			style={style as never}
		/>
	);
}
